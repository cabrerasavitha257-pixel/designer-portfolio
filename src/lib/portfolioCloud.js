import { cloudEnabled, getSupabase, supabaseUrl } from './supabase'

const MEDIA_BUCKET = 'portfolio-media'
const LARGE_FILE_THRESHOLD = 6 * 1024 * 1024

function publicUrl(path) {
  if (!path) return ''
  return getSupabase().storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

function fileExtension(file, fallback = 'bin') {
  const fromName = file?.name?.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName

  const fromMime = file?.type?.split('/').pop()?.replace('jpeg', 'jpg')
  return fromMime && /^[a-z0-9]+$/.test(fromMime) ? fromMime : fallback
}

async function dataUrlToFile(dataUrl, name) {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], `${name}.${fileExtension(blob, 'webp')}`, { type: blob.type })
}

async function uploadFile(path, file, { resumable = false, onProgress } = {}) {
  const supabase = getSupabase()

  if (!resumable || file.size <= LARGE_FILE_THRESHOLD) {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false,
    })
    if (error) throw error
    onProgress?.(100)
    return path
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session) throw sessionError || new Error('管理员登录已失效，请重新登录。')

  const tus = await import('tus-js-client')
  const projectId = new URL(supabaseUrl).hostname.split('.')[0]
  await new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${sessionData.session.access_token}`,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: LARGE_FILE_THRESHOLD,
      metadata: {
        bucketName: MEDIA_BUCKET,
        objectName: path,
        contentType: file.type || 'video/mp4',
        cacheControl: '3600',
      },
      onError: reject,
      onProgress(bytesUploaded, bytesTotal) {
        onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100))
      },
      onSuccess: resolve,
    })

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0])
      upload.start()
    }).catch(reject)
  })

  return path
}

async function removeMedia(paths) {
  const validPaths = paths.filter(Boolean)
  if (!validPaths.length) return
  await getSupabase().storage.from(MEDIA_BUCKET).remove(validPaths)
}

function mapProject(row) {
  const gallery = Array.isArray(row.data.gallery)
    ? row.data.gallery.map((item) => {
        const normalized = typeof item === 'string' ? { src: item } : item
        return {
          ...normalized,
          src: normalized.path ? publicUrl(normalized.path) : normalized.src,
        }
      })
    : []

  return {
    ...row.data,
    id: row.id,
    image: row.image_path ? publicUrl(row.image_path) : row.data.image,
    imagePath: row.image_path || '',
    gallery,
  }
}

function mapVideo(row) {
  return {
    ...row.data,
    id: row.id,
    poster: row.poster_path ? publicUrl(row.poster_path) : row.data.poster,
    videoUrl: row.video_path ? publicUrl(row.video_path) : '',
    videoPath: row.video_path || '',
    posterPath: row.poster_path || '',
  }
}

export async function loadCloudPortfolio() {
  if (!cloudEnabled) return null
  const supabase = getSupabase()
  const [contentResult, projectsResult, videosResult] = await Promise.all([
    supabase.from('site_content').select('content').eq('id', 'main').maybeSingle(),
    supabase.from('projects').select('*').order('sort_order', { ascending: true }),
    supabase.from('videos').select('*').order('sort_order', { ascending: true }),
  ])

  const error = contentResult.error || projectsResult.error || videosResult.error
  if (error) throw error

  return {
    content: contentResult.data?.content || null,
    projects: (projectsResult.data || []).map(mapProject),
    videos: (videosResult.data || []).map(mapVideo),
    isEmpty: !contentResult.data && !projectsResult.data?.length && !videosResult.data?.length,
  }
}

async function verifyAdmin(userId) {
  const { data, error } = await getSupabase()
    .from('portfolio_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export async function signInAdmin(email, password) {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  const isAdmin = await verifyAdmin(data.user.id)
  if (!isAdmin) {
    await supabase.auth.signOut()
    throw new Error('此账号没有作品集管理权限。')
  }

  return data.user
}

export async function restoreAdminSession() {
  if (!cloudEnabled) return false
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return false
  return verifyAdmin(data.user.id)
}

export async function signOutAdmin() {
  if (!cloudEnabled) return
  await getSupabase().auth.signOut()
}

export async function saveContentCloud(content) {
  const supabase = getSupabase()
  const nextContent = JSON.parse(JSON.stringify(content))
  let nextAvatarPath = nextContent.about?.avatarPath || ''
  const previousAvatarPath = nextAvatarPath

  if (nextContent.about?.avatar?.startsWith('data:')) {
    const file = await dataUrlToFile(nextContent.about.avatar, 'avatar')
    nextAvatarPath = `site/avatar-${Date.now()}.${fileExtension(file, 'webp')}`
    await uploadFile(nextAvatarPath, file)
    nextContent.about.avatar = publicUrl(nextAvatarPath)
    nextContent.about.avatarPath = nextAvatarPath
  }

  const { error } = await supabase.from('site_content').upsert({ id: 'main', content: nextContent })
  if (error) {
    if (nextAvatarPath !== previousAvatarPath) await removeMedia([nextAvatarPath])
    throw error
  }

  if (previousAvatarPath && previousAvatarPath !== nextAvatarPath) await removeMedia([previousAvatarPath])
  return nextContent
}

export async function saveProjectCloud(project, sortOrder = 0) {
  const supabase = getSupabase()
  const nextProject = { ...project }
  const previousImagePath = project.imagePath || ''
  const removedGalleryPaths = project.removedGalleryPaths || []
  const uploadedPaths = []
  let imagePath = previousImagePath

  try {
    if (project.image?.startsWith('data:')) {
      const file = await dataUrlToFile(project.image, `project-${project.id}`)
      imagePath = `projects/${project.id}/image-${Date.now()}.${fileExtension(file, 'webp')}`
      await uploadFile(imagePath, file)
      uploadedPaths.push(imagePath)
      nextProject.image = publicUrl(imagePath)
    }

    nextProject.gallery = []
    for (let index = 0; index < (project.gallery || []).length; index += 1) {
      const item = project.gallery[index]
      if (!item.src?.startsWith('data:')) {
        nextProject.gallery.push(item)
        continue
      }

      const file = await dataUrlToFile(item.src, `project-${project.id}-${index + 1}`)
      const path = `projects/${project.id}/gallery-${Date.now()}-${index + 1}.${fileExtension(file, 'webp')}`
      await uploadFile(path, file)
      uploadedPaths.push(path)
      nextProject.gallery.push({ ...item, src: publicUrl(path), path })
    }

    delete nextProject.imagePath
    delete nextProject.removedGalleryPaths
    const { error } = await supabase.from('projects').upsert({
      id: project.id,
      data: nextProject,
      image_path: imagePath || null,
      sort_order: sortOrder,
    })

    if (error) throw error
  } catch (error) {
    await removeMedia(uploadedPaths)
    throw error
  }

  await removeMedia([
    previousImagePath && previousImagePath !== imagePath ? previousImagePath : '',
    ...removedGalleryPaths,
  ])
  return { ...nextProject, imagePath }
}

export async function deleteProjectCloud(project) {
  const { error } = await getSupabase().from('projects').delete().eq('id', project.id)
  if (error) throw error
  await removeMedia([project.imagePath, ...(project.gallery || []).map((item) => item.path)])
}

export async function saveVideoCloud(video, file, sortOrder = 0, onProgress) {
  const supabase = getSupabase()
  const nextVideo = { ...video }
  const previousVideoPath = video.videoPath || ''
  const previousPosterPath = video.posterPath || ''
  let videoPath = previousVideoPath
  let posterPath = previousPosterPath

  if (file) {
    videoPath = `videos/${video.id}/video-${Date.now()}.${fileExtension(file, 'mp4')}`
    await uploadFile(videoPath, file, { resumable: true, onProgress })
  }

  if (video.poster?.startsWith('data:')) {
    const posterFile = await dataUrlToFile(video.poster, `poster-${video.id}`)
    posterPath = `videos/${video.id}/poster-${Date.now()}.${fileExtension(posterFile, 'jpg')}`
    await uploadFile(posterPath, posterFile)
    nextVideo.poster = publicUrl(posterPath)
  }

  delete nextVideo.videoUrl
  delete nextVideo.videoPath
  delete nextVideo.posterPath
  const { error } = await supabase.from('videos').upsert({
    id: video.id,
    data: nextVideo,
    video_path: videoPath || null,
    poster_path: posterPath || null,
    sort_order: sortOrder,
  })

  if (error) {
    await removeMedia([
      videoPath !== previousVideoPath ? videoPath : '',
      posterPath !== previousPosterPath ? posterPath : '',
    ])
    throw error
  }

  await removeMedia([
    previousVideoPath && previousVideoPath !== videoPath ? previousVideoPath : '',
    previousPosterPath && previousPosterPath !== posterPath ? previousPosterPath : '',
  ])

  return {
    ...nextVideo,
    videoUrl: publicUrl(videoPath),
    videoPath,
    posterPath,
  }
}

export async function deleteVideoCloud(video) {
  const { error } = await getSupabase().from('videos').delete().eq('id', video.id)
  if (error) throw error
  await removeMedia([video.videoPath, video.posterPath])
}
