import { useEffect, useRef, useState } from 'react'
import { cloudEnabled } from './lib/supabase'
import {
  deleteProjectCloud,
  deleteVideoCloud,
  loadCloudPortfolio,
  restoreAdminSession,
  saveContentCloud,
  saveProjectCloud,
  saveVideoCloud,
  signInAdmin,
  signOutAdmin,
} from './lib/portfolioCloud'

const STORAGE_KEY = 'designer-portfolio-projects-v1'
const CONTENT_STORAGE_KEY = 'designer-portfolio-content-v1'
const VIDEO_STORAGE_KEY = 'designer-portfolio-videos-v1'
const VIDEO_DB_NAME = 'designer-portfolio-media-v1'
const VIDEO_STORE_NAME = 'video-files'
const DEFAULT_CONTENT = {
  navigation: {
    brand: 'DS',
    about: '经历',
    projects: '项目',
    strengths: '优势',
    contact: '联系',
    contactAction: 'Start a project',
  },
  hero: {
    eyebrow: 'VISUAL DESIGNER / AI DESIGNER / BRAND DESIGNER',
    portfolioLabel: 'PORTFOLIO / 2026',
    title1: 'Visual systems',
    title2: 'for culture, products',
    title3: 'and intelligent brands.',
    intro: '以视觉秩序、AI 创意流程与品牌策略为核心，构建克制但有辨识度的数字化表达。',
    facts: ['AIGC IMAGE DIRECTION', 'BRAND VISUAL SYSTEMS', 'DIGITAL ART DIRECTION'],
    viewWorks: 'View selected works',
  },
  about: {
    avatar: '/assets/portrait.png',
    kicker: 'DESIGNER PROFILE / 01',
    title: '在品牌气质与 AI 生成能力之间，建立稳定的视觉判断。',
    body: '我是一名视觉设计师、AI 设计师与品牌设计师。关注品牌识别、生成式影像与数字体验，擅长把策略转译为清晰的视觉语言，并让概念在不同媒介中保持一致。',
    email: 'hello@portfolio.design',
    location: 'Shanghai / Remote',
    wechat: 'WeChat: your-id',
    disciplineValue: '03',
    disciplineLabel: 'Design disciplines',
    projectCountLabel: 'Project records',
    systemValue: '01',
    systemLabel: 'Portfolio system',
    workflowValue: 'AI',
    workflowLabel: 'Native workflow',
  },
  archive: {
    tags: ['全部作品', 'AIGC 影像', '品牌视觉', '商业项目', '生成实验', '视觉系统'],
    kicker: 'SELECTED ARCHIVE',
    title: '视觉项目档案',
    summary: '以项目为单位整理视觉方向、生成影像与品牌表达，让每一组作品都保留完整的语境与判断。',
    specs: [
      { label: 'FOCUS', value: 'Visual Direction' },
      { label: 'FORMAT', value: 'Project Archive' },
      { label: 'UPDATED', value: '2026' },
    ],
    emptyKicker: 'SELECTED WORK / 00',
    emptyTitle: 'New work is being prepared.',
    emptyMeta: 'VISUAL DESIGN / AI DIRECTION / BRAND SYSTEM',
    countLabel: 'ARCHIVE',
    projectCode: 'PROJECT',
  },
  videos: {
    kicker: 'MOTION ARCHIVE',
    title: '动态影像作品',
    summary: '收录品牌动态、AIGC 影像与视觉实验，让时间、声音与节奏成为视觉系统的一部分。',
    code: 'VIDEO',
    emptyKicker: 'VIDEO WORK / 00',
    emptyTitle: 'Video work is being prepared.',
    emptyMeta: 'MOTION DESIGN / AIGC FILM / BRAND CONTENT',
  },
  strengths: {
    kicker: 'CAPABILITIES',
    title: '从判断到落地。',
    note: '策略、生成与执行由同一套视觉标准贯穿，减少概念在落地过程中的损耗。',
    items: [
      {
        label: 'Visual System',
        text: '将品牌识别、版式、色彩与动态语言统一成可延展的视觉系统。',
      },
      {
        label: 'AI Workflow',
        text: '用 AI 参与概念探索、视觉提案与高效迭代，保持审美判断在核心位置。',
      },
      {
        label: 'Brand Thinking',
        text: '从品牌定位出发，把抽象气质转译为清晰、可执行的视觉方向。',
      },
      {
        label: 'Execution Detail',
        text: '关注落地细节，让作品在屏幕、社媒、发布页与提案中保持一致质感。',
      },
    ],
  },
  contact: {
    status: 'OPEN FOR SELECTED COLLABORATIONS',
    kicker: 'CONTACT / START A CONVERSATION',
    title1: 'Let’s make ideas',
    title2: 'visually inevitable.',
    email: 'hello@portfolio.design',
    backTop: 'Back to top',
  },
}

function loadProjects() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed)
      ? parsed.map((project) => ({
          ...project,
          image: project.image?.replace(/(\/assets\/aigc-model\/[^.]+)\.png$/i, '$1.webp'),
        }))
      : []
  } catch {
    return []
  }
}

function loadVideos() {
  try {
    const stored = window.localStorage.getItem(VIDEO_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function mergeContent(parsed = {}) {
  return {
    navigation: { ...DEFAULT_CONTENT.navigation, ...parsed.navigation },
    hero: {
      ...DEFAULT_CONTENT.hero,
      ...parsed.hero,
      facts: parsed.hero?.facts || DEFAULT_CONTENT.hero.facts,
    },
    about: { ...DEFAULT_CONTENT.about, ...parsed.about },
    archive: {
      ...DEFAULT_CONTENT.archive,
      ...parsed.archive,
      tags: parsed.archive?.tags || DEFAULT_CONTENT.archive.tags,
      specs: parsed.archive?.specs || DEFAULT_CONTENT.archive.specs,
    },
    videos: { ...DEFAULT_CONTENT.videos, ...parsed.videos },
    strengths: {
      ...DEFAULT_CONTENT.strengths,
      ...parsed.strengths,
      items: parsed.strengths?.items || DEFAULT_CONTENT.strengths.items,
    },
    contact: { ...DEFAULT_CONTENT.contact, ...parsed.contact },
  }
}

function loadContent() {
  try {
    const stored = window.localStorage.getItem(CONTENT_STORAGE_KEY)
    return stored ? mergeContent(JSON.parse(stored)) : DEFAULT_CONTENT
  } catch {
    return DEFAULT_CONTENT
  }
}

function openVideoDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(VIDEO_DB_NAME, 1)
    request.onerror = () => reject(new Error('无法打开视频存储'))
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(VIDEO_STORE_NAME)) {
        database.createObjectStore(VIDEO_STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

async function saveVideoBlob(videoId, file) {
  const database = await openVideoDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(VIDEO_STORE_NAME, 'readwrite')
    transaction.objectStore(VIDEO_STORE_NAME).put(file, videoId)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(new Error('视频保存失败，浏览器空间可能不足'))
    }
  })
}

async function getVideoBlob(videoId) {
  const database = await openVideoDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(VIDEO_STORE_NAME, 'readonly')
    const request = transaction.objectStore(VIDEO_STORE_NAME).get(videoId)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('视频读取失败'))
    transaction.oncomplete = () => database.close()
  })
}

async function deleteVideoBlob(videoId) {
  const database = await openVideoDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(VIDEO_STORE_NAME, 'readwrite')
    transaction.objectStore(VIDEO_STORE_NAME).delete(videoId)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(new Error('视频删除失败'))
    }
  })
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return ''
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function inspectVideoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('video/')) {
      reject(new Error('请选择视频文件'))
      return
    }

    const source = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    function cleanUp() {
      URL.revokeObjectURL(source)
      video.removeAttribute('src')
      video.load()
    }

    video.onerror = () => {
      cleanUp()
      reject(new Error('当前浏览器无法解析这个视频，请优先使用 MP4（H.264）'))
    }

    video.onloadedmetadata = () => {
      const captureTime = Math.min(1, Math.max(0, video.duration / 4))
      video.currentTime = captureTime
    }

    video.onseeked = () => {
      const maxWidth = 1280
      const scale = Math.min(1, maxWidth / video.videoWidth)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
      const context = canvas.getContext('2d')
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const result = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        poster: canvas.toDataURL('image/jpeg', 0.82),
      }
      cleanUp()
      resolve(result)
    }

    video.src = source
  })
}

function compressImage(file, maxSide = 1800, quality = 0.86) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('图片解析失败'))
      image.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/webp', quality))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function Header({ content, isAdmin, onManage, onEditContent, onLogout }) {
  const navigation = content.navigation

  return (
    <header className={`site-header${isAdmin ? ' is-admin' : ''}`}>
      <a className="brand-mark" href="#top" aria-label="Back to top">
        <span>{navigation.brand}</span>
      </a>
      <nav className="main-nav" aria-label="Primary navigation">
        <a href="#about">{navigation.about}</a>
        <a href="#projects">{navigation.projects}</a>
        <a href="#strengths">{navigation.strengths}</a>
        <a href="#contact">{navigation.contact}</a>
      </nav>
      <div className="header-actions">
        {isAdmin ? (
          <>
            <button className="manage-button" type="button" onClick={onEditContent}>
              编辑内容
            </button>
            <button className="manage-button" type="button" onClick={onLogout}>
              退出管理
            </button>
          </>
        ) : (
          <button className="manage-button" type="button" onClick={onManage}>
            管理作品
          </button>
        )}
        <a className="contact-pill" href={`mailto:${content.contact.email}`}>
          {navigation.contactAction}
        </a>
      </div>
    </header>
  )
}

function Hero({ content }) {
  const hero = content.hero
  const heroVideoUrl = hero.videoUrl || import.meta.env.VITE_HERO_VIDEO_URL || '/assets/portfolio-motion-cover.mp4'

  return (
    <section className="hero" id="top">
      <video
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        poster="/assets/hero-poster.webp"
      >
        <source src={heroVideoUrl} type="video/mp4" />
      </video>
      <div className="hero-shade" />
      <div className="hero-content page-shell">
        <div className="hero-topline">
          <p className="eyebrow">{hero.eyebrow}</p>
          <span>{hero.portfolioLabel}</span>
        </div>
        <h1>
          {hero.title1}
          <span>{hero.title2}</span>
          <em>{hero.title3}</em>
        </h1>
        <div className="hero-lower">
          <p>{hero.intro}</p>
          <div className="hero-facts" aria-label="Portfolio focus">
            {hero.facts.map((fact, index) => (
              <span key={`${fact}-${index}`}>{fact}</span>
            ))}
          </div>
          <a className="primary-link" href="#projects">
            {hero.viewWorks}
          </a>
        </div>
      </div>
    </section>
  )
}

function About({ content, projectCount }) {
  const about = content.about
  const stats = [
    [about.disciplineValue, about.disciplineLabel],
    [String(projectCount).padStart(2, '0'), about.projectCountLabel],
    [about.systemValue, about.systemLabel],
    [about.workflowValue, about.workflowLabel],
  ]

  return (
    <section className="section about-section" id="about">
      <div className="page-shell">
        <div className="about-grid">
          <div className="portrait-wrap">
            <img src={about.avatar} alt="Designer portrait" />
          </div>
          <div className="about-copy">
            <p className="section-kicker">{about.kicker}</p>
            <h2>{about.title}</h2>
            <p>{about.body}</p>
            <div className="contact-list" aria-label="Contact information">
              <span>{about.email}</span>
              <span>{about.location}</span>
              <span>{about.wechat}</span>
            </div>
            <div className="stats-grid">
              {stats.map(([value, label]) => (
                <div className="stat-card" key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="archive-bar" aria-label="Design disciplines">
          <div className="archive-tags">
            {content.archive.tags.map((tag, index) => (
              <span className={index === 0 ? 'is-active' : ''} key={`${tag}-${index}`}>
                {tag}
              </span>
            ))}
          </div>
          <span className="archive-count">
            {content.archive.countLabel} / {String(projectCount).padStart(2, '0')}
          </span>
        </div>
      </div>
    </section>
  )
}

function ProjectGallery({ project, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const images = []
  const seenSources = new Set()

  ;[
    { src: project.image, alt: project.alt || project.title },
    ...(Array.isArray(project.gallery) ? project.gallery : []),
  ].forEach((item) => {
    const normalized = typeof item === 'string' ? { src: item, alt: project.title } : item
    if (!normalized?.src || seenSources.has(normalized.src)) return
    seenSources.add(normalized.src)
    images.push(normalized)
  })

  useEffect(() => {
    setActiveIndex(0)
  }, [project.id])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') {
        setActiveIndex((current) => (current - 1 + images.length) % images.length)
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((current) => (current + 1) % images.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [images.length, onClose])

  const activeImage = images[activeIndex]
  const showPrevious = () => setActiveIndex((current) => (current - 1 + images.length) % images.length)
  const showNext = () => setActiveIndex((current) => (current + 1) % images.length)

  return (
    <div
      className="project-gallery-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="project-gallery-panel" role="dialog" aria-modal="true" aria-label={`${project.title} 项目图库`}>
        <header className="project-gallery-header">
          <div>
            <span>{project.type}</span>
            <strong>{project.title}</strong>
          </div>
          <div className="project-gallery-tools">
            <span>{String(activeIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span>
            <a href={activeImage?.src} target="_blank" rel="noreferrer">查看原图</a>
            <button type="button" onClick={onClose} aria-label="关闭项目图库" title="关闭">×</button>
          </div>
        </header>

        <div className="project-gallery-stage">
          {images.length > 1 && (
            <button className="project-gallery-arrow is-previous" type="button" onClick={showPrevious} aria-label="上一张" title="上一张">
              ←
            </button>
          )}
          {activeImage && <img src={activeImage.src} alt={activeImage.alt || `${project.title} ${activeIndex + 1}`} />}
          {images.length > 1 && (
            <button className="project-gallery-arrow is-next" type="button" onClick={showNext} aria-label="下一张" title="下一张">
              →
            </button>
          )}
        </div>

        {images.length > 1 && (
          <div className="project-gallery-thumbnails" aria-label="项目图片列表">
            {images.map((image, index) => (
              <button
                className={index === activeIndex ? 'is-active' : ''}
                type="button"
                key={`${image.src}-${index}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`查看第 ${index + 1} 张`}
              >
                <img src={image.src} alt="" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Projects({ content, projects, isAdmin, onAdd, onEdit, onDelete, onEditContent, storageError }) {
  const archive = content.archive
  const [activeProject, setActiveProject] = useState(null)

  return (
    <section className="section projects-section" id="projects">
      <div className="page-shell">
        <div className="project-heading">
          <div>
            <p className="section-kicker">{archive.kicker}</p>
            <h2>{archive.title}</h2>
          </div>
          <div className="project-summary">
            <p>{archive.summary}</p>
            <dl className="project-specs">
              {archive.specs.map((spec, index) => (
                <div key={`${spec.label}-${index}`}>
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {isAdmin && (
          <div className="admin-toolbar">
            <div>
              <strong>管理模式</strong>
              <span>{storageError || String(projects.length) + ' 个项目保存在当前浏览器'}</span>
            </div>
            <div className="admin-toolbar-actions">
              <button className="admin-secondary-button" type="button" onClick={onEditContent}>
                编辑网站内容
              </button>
              <button className="admin-primary-button" type="button" onClick={onAdd}>
                新增项目
              </button>
            </div>
          </div>
        )}

        {projects.length > 0 ? (
          <div className="project-grid">
            {projects.map((project, index) => (
              <article className="project-card" key={project.id}>
                <div className="project-visual">
                  <button
                    className="project-open-button"
                    type="button"
                    onClick={() => setActiveProject(project)}
                    aria-label={`打开 ${project.title} 项目图库`}
                  >
                    <img src={project.image} alt={project.alt || project.title} />
                    <span className="project-code">
                      {archive.projectCode} / {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="project-image-count">
                      VIEW SERIES · {String((project.gallery?.length || 0) + 1).padStart(2, '0')}
                    </span>
                  </button>
                  {isAdmin && (
                    <div className="project-admin-actions">
                      <button type="button" onClick={() => onEdit(project)}>
                        编辑
                      </button>
                      <button type="button" onClick={() => onDelete(project.id)}>
                        删除
                      </button>
                    </div>
                  )}
                </div>
                <div className="project-info">
                  <div>
                    <p>{project.type}</p>
                    <h3>{project.title}</h3>
                    {project.description && <small>{project.description}</small>}
                  </div>
                  <span>{project.year || '2026'}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="archive-empty">
            <p>{archive.emptyKicker}</p>
            <h3>{archive.emptyTitle}</h3>
            <span>{archive.emptyMeta}</span>
            {isAdmin && (
              <button className="admin-primary-button" type="button" onClick={onAdd}>
                添加第一个项目
              </button>
            )}
          </div>
        )}
      </div>
      {activeProject && <ProjectGallery project={activeProject} onClose={() => setActiveProject(null)} />}
    </section>
  )
}

function useVideoSources(videos) {
  const [sources, setSources] = useState({})

  useEffect(() => {
    let disposed = false
    const objectUrls = []

    async function loadSources() {
      const entries = await Promise.all(
        videos.map(async (video) => {
          if (video.videoUrl) return [video.id, video.videoUrl]

          try {
            const blob = await getVideoBlob(video.id)
            if (!blob) return [video.id, '']
            const source = URL.createObjectURL(blob)
            if (disposed) {
              URL.revokeObjectURL(source)
              return [video.id, '']
            }
            objectUrls.push(source)
            return [video.id, source]
          } catch {
            return [video.id, '']
          }
        }),
      )

      if (!disposed) setSources(Object.fromEntries(entries))
    }

    loadSources()
    return () => {
      disposed = true
      objectUrls.forEach((source) => URL.revokeObjectURL(source))
    }
  }, [videos])

  return sources
}

function PortfolioVideo({ video, source }) {
  const playerRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackError, setPlaybackError] = useState('')

  useEffect(() => {
    setIsPlaying(false)
    setPlaybackError('')
  }, [source])

  async function startPlayback() {
    const player = playerRef.current
    if (!player) return

    try {
      setPlaybackError('')
      await player.play()
    } catch {
      setPlaybackError('视频无法播放，请重新上传 MP4（H.264）格式的视频。')
    }
  }

  return (
    <>
      <video
        ref={playerRef}
        controls
        playsInline
        preload="metadata"
        poster={video.poster || undefined}
        src={source}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setPlaybackError('视频无法播放，请重新上传 MP4（H.264）格式的视频。')}
      />
      {!isPlaying && !playbackError && (
        <button className="video-play-button" type="button" onClick={startPlayback} aria-label={`播放 ${video.title}`}>
          <span aria-hidden="true" />
        </button>
      )}
      {playbackError && (
        <button className="video-playback-error" type="button" onClick={startPlayback}>
          <strong>无法播放视频</strong>
          <span>{playbackError}</span>
        </button>
      )}
    </>
  )
}

function VideoViewer({ video, source, onClose }) {
  const isPortrait = video.height > video.width

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      className="video-viewer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className={`video-viewer-panel${isPortrait ? ' is-portrait' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={video.title}
      >
        <header className="video-viewer-header">
          <div>
            <span>NOW VIEWING</span>
            <strong>{video.title}</strong>
          </div>
          <button className="video-viewer-close" type="button" onClick={onClose} aria-label="关闭视频" title="关闭">
            ×
          </button>
        </header>
        <div
          className="video-viewer-frame"
          style={video.width > 0 && video.height > 0 ? { aspectRatio: `${video.width} / ${video.height}` } : undefined}
        >
          {source ? (
            <PortfolioVideo video={video} source={source} />
          ) : (
            <div className="video-unavailable">
              <span>VIDEO FILE UNAVAILABLE</span>
            </div>
          )}
        </div>
        <footer className="video-viewer-footer">
          <span>{video.type}</span>
          <span>{video.year || '2026'} / {formatDuration(video.duration)}</span>
        </footer>
      </section>
    </div>
  )
}

function VideoWorks({ content, videos, isAdmin, onAdd, onEdit, onDelete, storageError }) {
  const copy = content.videos
  const sources = useVideoSources(videos)
  const [activeVideo, setActiveVideo] = useState(null)

  return (
    <section className="section videos-section" id="videos">
      <div className="page-shell">
        <div className="video-section-heading">
          <div>
            <p className="section-kicker">{copy.kicker}</p>
            <h2>{copy.title}</h2>
          </div>
          <p>{copy.summary}</p>
        </div>

        {isAdmin && (
          <div className="admin-toolbar video-admin-toolbar">
            <div>
              <strong>视频管理</strong>
              <span>{storageError || `${videos.length} 个视频保存在当前浏览器`}</span>
            </div>
            <button className="admin-primary-button" type="button" onClick={onAdd}>
              上传视频作品
            </button>
          </div>
        )}

        {videos.length > 0 ? (
          <div className="video-grid">
            {videos.map((video, index) => (
              <article
                className={`video-card${video.height > video.width ? ' is-portrait' : ' is-landscape'}`}
                key={video.id}
              >
                <div className="video-cover">
                  <button className="video-cover-button" type="button" onClick={() => setActiveVideo(video)}>
                    {video.poster ? (
                      <img src={video.poster} alt="" />
                    ) : (
                      <span className="video-cover-fallback">MOTION ARCHIVE</span>
                    )}
                    <span className="video-code">
                      {copy.code} / {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="video-cover-play" aria-hidden="true"><i /></span>
                    <span className="video-cover-action">
                      <small>OPEN FILM</small>
                      <b>{formatDuration(video.duration)}</b>
                    </span>
                  </button>
                  {!sources[video.id] && (
                    <div className="video-source-status">
                      <span>LOADING VIDEO</span>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="project-admin-actions">
                      <button type="button" onClick={() => onEdit(video)}>
                        编辑
                      </button>
                      <button type="button" onClick={() => onDelete(video.id)}>
                        删除
                      </button>
                    </div>
                  )}
                </div>
                <div className="video-info">
                  <div>
                    <p>{video.type}</p>
                    <h3>{video.title}</h3>
                    {video.description && <small>{video.description}</small>}
                  </div>
                  <div className="video-meta">
                    <span>{video.year || '2026'}</span>
                    {video.duration && <span>{formatDuration(video.duration)}</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="video-empty">
            <p>{copy.emptyKicker}</p>
            <h3>{copy.emptyTitle}</h3>
            <span>{copy.emptyMeta}</span>
            {isAdmin && (
              <button className="admin-primary-button" type="button" onClick={onAdd}>
                上传第一个视频
              </button>
            )}
          </div>
        )}
      </div>

      {activeVideo && (
        <VideoViewer
          video={activeVideo}
          source={sources[activeVideo.id]}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </section>
  )
}

function Strengths({ content }) {
  const strengths = content.strengths

  return (
    <section className="section strengths-section" id="strengths">
      <div className="page-shell">
        <div className="section-heading">
          <div>
            <p className="section-kicker">{strengths.kicker}</p>
            <h2>{strengths.title}</h2>
          </div>
          <p className="section-note">{strengths.note}</p>
        </div>
        <div className="strength-grid">
          {strengths.items.map((item, index) => (
            <article className="strength-card" key={item.label}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{item.label}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Contact({ content }) {
  const contact = content.contact

  return (
    <section className="contact-section" id="contact">
      <div className="page-shell contact-inner">
        <div className="contact-copy">
          <div className="contact-status">
            <span aria-hidden="true" />
            {contact.status}
          </div>
          <p className="section-kicker">{contact.kicker}</p>
          <h2>
            {contact.title1}
            <em>{contact.title2}</em>
          </h2>
        </div>
        <div className="contact-actions">
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <a href="#top">{contact.backTop}</a>
        </div>
      </div>
    </section>
  )
}

function AdminLogin({ onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      if (!cloudEnabled) throw new Error('云端管理尚未配置，完成 Supabase 连接后即可登录。')
      await signInAdmin(email, password)
      onSuccess()
    } catch (loginError) {
      setError(loginError.message || '登录失败，请检查账号和密码。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="admin-login-modal" role="dialog" aria-modal="true" aria-labelledby="admin-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="关闭" title="关闭">
          ×
        </button>
        <p className="modal-kicker">PRIVATE EDITING MODE</p>
        <h2 id="admin-title">管理员访问</h2>
        <p>使用云端管理员账号登录。</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="admin-email">邮箱</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="管理员邮箱"
            autoComplete="username"
            autoFocus
            required
          />
          <label htmlFor="admin-password">密码</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="输入管理密码"
            autoComplete="current-password"
            required
          />
          {error && <span className="form-error">{error}</span>}
          <button className="admin-primary-button" type="submit" disabled={busy}>
            {busy ? '验证中…' : '进入管理'}
          </button>
        </form>
        <button className="modal-return" type="button" onClick={onClose}>
          返回作品集
        </button>
      </section>
    </div>
  )
}

function ProjectEditor({ project, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    title: project?.title || '',
    type: project?.type || 'Visual Design',
    year: project?.year || '2026',
    description: project?.description || '',
    image: project?.image || '',
    alt: project?.alt || '',
    gallery: (project?.gallery || []).map((item) => {
      const normalized = typeof item === 'string' ? { src: item } : item
      return { ...normalized, id: normalized.id || window.crypto.randomUUID() }
    }),
    removedGalleryPaths: [],
  }))
  const [error, setError] = useState('')
  const [processingImage, setProcessingImage] = useState(false)
  const [saving, setSaving] = useState(false)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setProcessingImage(true)
    setError('')
    try {
      const image = await compressImage(file)
      setForm((current) => ({ ...current, image }))
    } catch (imageError) {
      setError(imageError.message)
    } finally {
      setProcessingImage(false)
    }
  }

  async function handleGalleryFiles(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    setProcessingImage(true)
    setError('')
    try {
      const additions = []
      for (const file of files) {
        additions.push({
          id: window.crypto.randomUUID(),
          src: await compressImage(file, 2000, 0.88),
          path: '',
          alt: form.title || file.name,
        })
      }
      setForm((current) => ({ ...current, gallery: [...current.gallery, ...additions] }))
      event.target.value = ''
    } catch (imageError) {
      setError(imageError.message)
    } finally {
      setProcessingImage(false)
    }
  }

  function removeGalleryImage(itemId) {
    setForm((current) => {
      const target = current.gallery.find((item) => item.id === itemId)
      return {
        ...current,
        gallery: current.gallery.filter((item) => item.id !== itemId),
        removedGalleryPaths: target?.path
          ? [...current.removedGalleryPaths, target.path]
          : current.removedGalleryPaths,
      }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.image) {
      setError('请上传图片或填写图片地址')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        ...form,
        id: project?.id || window.crypto.randomUUID(),
        imagePath: project?.imagePath || '',
        alt: form.alt || form.title,
      })
    } catch (saveError) {
      setError(saveError.message || '项目保存失败，请重试。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="project-editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="关闭" title="关闭">
          ×
        </button>
        <p className="modal-kicker">PROJECT EDITOR</p>
        <h2 id="editor-title">{project ? '编辑项目' : '新增项目'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="editor-fields">
            <label>
              项目名称
              <input name="title" value={form.title} onChange={updateField} required />
            </label>
            <label>
              项目类型
              <input name="type" value={form.type} onChange={updateField} required />
            </label>
            <label>
              年份
              <input name="year" value={form.year} onChange={updateField} />
            </label>
            <label className="editor-field-wide">
              项目简介
              <textarea name="description" value={form.description} onChange={updateField} rows="3" />
            </label>
            <label className="editor-field-wide">
              图片地址
              <input
                name="image"
                value={form.image.startsWith('data:') ? '' : form.image}
                onChange={updateField}
                placeholder="https://..."
              />
            </label>
            <label className="editor-field-wide file-field">
              上传主页封面
              <input type="file" accept="image/*" onChange={handleFile} />
            </label>
            <label className="editor-field-wide file-field">
              批量添加项目内页图片
              <input type="file" accept="image/*" multiple onChange={handleGalleryFiles} />
            </label>
          </div>

          {form.image && (
            <div className="editor-preview">
              <img src={form.image} alt="项目图片预览" />
            </div>
          )}
          {form.gallery.length > 0 && (
            <div className="editor-gallery">
              <div className="editor-gallery-heading">
                <strong>项目内页</strong>
                <span>{form.gallery.length} 张</span>
              </div>
              <div className="editor-gallery-grid">
                {form.gallery.map((item, index) => (
                  <div className="editor-gallery-item" key={item.id}>
                    <img src={item.src} alt={`${form.title || '项目'}内页 ${index + 1}`} />
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <button type="button" onClick={() => removeGalleryImage(item.id)} aria-label={`删除第 ${index + 1} 张`} title="删除">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && <span className="form-error">{error}</span>}

          <div className="editor-actions">
            <button type="button" onClick={onClose}>
              取消
            </button>
            <button className="admin-primary-button" type="submit" disabled={processingImage || saving}>
              {processingImage ? '处理图片中…' : saving ? '正在保存…' : '保存项目'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function VideoEditor({ video, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    title: video?.title || '',
    type: video?.type || 'Motion Design',
    year: video?.year || '2026',
    description: video?.description || '',
    poster: video?.poster || '',
    duration: video?.duration || 0,
    width: video?.width || 0,
    height: video?.height || 0,
    fileName: video?.fileName || '',
    mimeType: video?.mimeType || 'video/mp4',
    size: video?.size || 0,
  }))
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!video?.id) return undefined
    if (video.videoUrl) {
      setPreviewUrl(video.videoUrl)
      return undefined
    }

    let cancelled = false

    getVideoBlob(video.id)
      .then((blob) => {
        if (!blob || cancelled) return
        setPreviewUrl(URL.createObjectURL(blob))
      })
      .catch(() => setError('视频文件读取失败'))

    return () => {
      cancelled = true
    }
  }, [video])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleFile(event) {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setProcessing(true)
    setError('')
    try {
      const details = await inspectVideoFile(selectedFile)
      setFile(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
      setForm((current) => ({
        ...current,
        poster: details.poster,
        duration: details.duration,
        width: details.width,
        height: details.height,
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'video/mp4',
        size: selectedFile.size,
      }))
    } catch (videoError) {
      setError(videoError.message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!file && !video) {
      setError('请先选择视频文件')
      return
    }

    setSaving(true)
    setUploadProgress(0)
    setError('')
    try {
      await onSave(
        {
          ...form,
          id: video?.id || window.crypto.randomUUID(),
          videoUrl: video?.videoUrl || '',
          videoPath: video?.videoPath || '',
          posterPath: video?.posterPath || '',
        },
        file,
        setUploadProgress,
      )
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const fileSize = form.size ? `${(form.size / 1024 / 1024).toFixed(1)} MB` : ''

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="project-editor-modal video-editor-modal" role="dialog" aria-modal="true" aria-labelledby="video-editor-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="关闭" title="关闭">
          ×
        </button>
        <p className="modal-kicker">VIDEO WORK EDITOR</p>
        <h2 id="video-editor-title">{video ? '编辑视频作品' : '上传视频作品'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="editor-fields">
            <label>
              作品名称
              <input name="title" value={form.title} onChange={updateField} required />
            </label>
            <label>
              作品类型
              <input name="type" value={form.type} onChange={updateField} required />
            </label>
            <label>
              年份
              <input name="year" value={form.year} onChange={updateField} />
            </label>
            <label className="editor-field-wide">
              作品简介
              <textarea name="description" value={form.description} onChange={updateField} rows="3" />
            </label>
            <label className="editor-field-wide file-field">
              {video ? '替换视频文件（可选）' : '选择视频文件'}
              <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleFile} />
              <span>推荐 MP4（H.264），视频将保存在当前浏览器</span>
            </label>
          </div>

          {previewUrl && (
            <div className="video-editor-preview">
              <video controls playsInline preload="metadata" poster={form.poster || undefined} src={previewUrl} />
            </div>
          )}

          {(form.fileName || form.duration) && (
            <div className="video-file-meta">
              <span>{form.fileName}</span>
              {form.width > 0 && <span>{form.width} × {form.height}</span>}
              {form.duration > 0 && <span>{formatDuration(form.duration)}</span>}
              {fileSize && <span>{fileSize}</span>}
              {saving && uploadProgress > 0 && <span>上传 {uploadProgress}%</span>}
            </div>
          )}
          {error && <span className="form-error">{error}</span>}

          <div className="editor-actions">
            <button type="button" onClick={onClose}>
              取消
            </button>
            <button className="admin-primary-button" type="submit" disabled={processing || saving}>
              {processing ? '正在读取视频…' : saving ? '正在保存…' : '保存视频作品'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

const CONTENT_TABS = [
  ['hero', '封面与导航'],
  ['about', '个人资料'],
  ['archive', '项目区域'],
  ['strengths', '优势与联系'],
]

function SiteContentEditor({ content, onClose, onSave }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(content)))
  const [activeTab, setActiveTab] = useState('hero')
  const [error, setError] = useState('')
  const [processingAvatar, setProcessingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [position, setPosition] = useState(() => {
    const width = Math.min(760, window.innerWidth - 32)
    return { x: Math.max(16, window.innerWidth - width - 16), y: 16 }
  })
  const [dragState, setDragState] = useState(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const panelRef = useRef(null)

  function startDragging(event) {
    if (isMaximized || event.button !== 0) return
    const rect = panelRef.current.getBoundingClientRect()
    setDragState({
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function movePanel(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return
    const panel = panelRef.current
    const maxX = Math.max(0, window.innerWidth - Math.min(120, panel.offsetWidth))
    const maxY = Math.max(0, window.innerHeight - 64)
    setPosition({
      x: Math.min(maxX, Math.max(0, event.clientX - dragState.offsetX)),
      y: Math.min(maxY, Math.max(0, event.clientY - dragState.offsetY)),
    })
  }

  function stopDragging(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return
    setDragState(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function toggleMaximize() {
    setIsMaximized((current) => !current)
    setIsMinimized(false)
  }

  function updateSection(section, key, value) {
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }))
  }

  function updateArrayItem(section, key, index, value) {
    setDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: current[section][key].map((item, itemIndex) =>
          itemIndex === index ? value : item,
        ),
      },
    }))
  }

  async function handleAvatar(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setProcessingAvatar(true)
    setError('')
    try {
      const avatar = await compressImage(file, 900, 0.84)
      updateSection('about', 'avatar', avatar)
    } catch (imageError) {
      setError(imageError.message)
    } finally {
      setProcessingAvatar(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
    } catch (saveError) {
      setError(saveError.message || '网站内容保存失败，请重试。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop content-editor-backdrop" role="presentation">
      <section
        ref={panelRef}
        className={`project-editor-modal site-content-modal${isMinimized ? ' is-minimized' : ''}${isMaximized ? ' is-maximized' : ''}`}
        style={isMaximized ? undefined : { left: position.x, top: position.y }}
        role="dialog"
        aria-modal="false"
        aria-labelledby="content-editor-title"
      >
        <div
          className="floating-editor-titlebar"
          onPointerDown={startDragging}
          onPointerMove={movePanel}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          <div>
            <p className="modal-kicker">SITE CONTENT EDITOR</p>
            <h2 id="content-editor-title">编辑网站内容</h2>
          </div>
          <div className="window-controls" onPointerDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsMinimized((current) => !current)}
              aria-label={isMinimized ? '展开编辑器' : '最小化编辑器'}
              title={isMinimized ? '展开' : '最小化'}
            >
              {isMinimized ? '+' : '−'}
            </button>
            <button
              type="button"
              onClick={toggleMaximize}
              aria-label={isMaximized ? '还原编辑器' : '最大化编辑器'}
              title={isMaximized ? '还原' : '最大化'}
            >
              {isMaximized ? '❐' : '□'}
            </button>
            <button type="button" onClick={onClose} aria-label="关闭编辑器" title="关闭">
              ×
            </button>
          </div>
        </div>

        <div className="settings-tabs" role="tablist" aria-label="内容分区">
          {CONTENT_TABS.map(([id, label]) => (
            <button
              className={activeTab === id ? 'is-active' : ''}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              key={id}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === 'hero' && (
            <div className="settings-panel">
              <div className="settings-group">
                <h3>导航栏</h3>
                <div className="settings-grid settings-grid-3">
                  {[
                    ['brand', '标志文字'],
                    ['about', '经历导航'],
                    ['projects', '项目导航'],
                    ['strengths', '优势导航'],
                    ['contact', '联系导航'],
                    ['contactAction', '联系按钮'],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        value={draft.navigation[key]}
                        onChange={(event) => updateSection('navigation', key, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <h3>首页封面</h3>
                <div className="settings-grid">
                  <label>
                    身份标签
                    <input value={draft.hero.eyebrow} onChange={(event) => updateSection('hero', 'eyebrow', event.target.value)} />
                  </label>
                  <label>
                    年份标签
                    <input value={draft.hero.portfolioLabel} onChange={(event) => updateSection('hero', 'portfolioLabel', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    主标题第一行
                    <input value={draft.hero.title1} onChange={(event) => updateSection('hero', 'title1', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    主标题第二行
                    <input value={draft.hero.title2} onChange={(event) => updateSection('hero', 'title2', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    主标题第三行
                    <input value={draft.hero.title3} onChange={(event) => updateSection('hero', 'title3', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    简介
                    <textarea rows="3" value={draft.hero.intro} onChange={(event) => updateSection('hero', 'intro', event.target.value)} />
                  </label>
                  {draft.hero.facts.map((fact, index) => (
                    <label key={`fact-${index}`}>
                      专业方向 {index + 1}
                      <input value={fact} onChange={(event) => updateArrayItem('hero', 'facts', index, event.target.value)} />
                    </label>
                  ))}
                  <label>
                    查看作品按钮
                    <input value={draft.hero.viewWorks} onChange={(event) => updateSection('hero', 'viewWorks', event.target.value)} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="settings-panel">
              <div className="settings-group avatar-settings">
                <h3>头像</h3>
                <div className="avatar-editor">
                  <div className="avatar-preview">
                    <img src={draft.about.avatar} alt="头像预览" />
                  </div>
                  <label className="file-field">
                    上传头像图片
                    <input type="file" accept="image/*" onChange={handleAvatar} />
                    <span>{processingAvatar ? '正在处理图片…' : '支持 JPG、PNG、WebP，上传后自动压缩'}</span>
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h3>个人介绍</h3>
                <div className="settings-grid">
                  <label>
                    分区标签
                    <input value={draft.about.kicker} onChange={(event) => updateSection('about', 'kicker', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    介绍标题
                    <textarea rows="2" value={draft.about.title} onChange={(event) => updateSection('about', 'title', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    个人介绍
                    <textarea rows="5" value={draft.about.body} onChange={(event) => updateSection('about', 'body', event.target.value)} />
                  </label>
                  <label>
                    邮箱
                    <input value={draft.about.email} onChange={(event) => updateSection('about', 'email', event.target.value)} />
                  </label>
                  <label>
                    所在地
                    <input value={draft.about.location} onChange={(event) => updateSection('about', 'location', event.target.value)} />
                  </label>
                  <label>
                    微信或其他联系方式
                    <input value={draft.about.wechat} onChange={(event) => updateSection('about', 'wechat', event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h3>项目数据</h3>
                <div className="settings-grid settings-grid-4">
                  {[
                    ['disciplineValue', '能力数量'],
                    ['disciplineLabel', '能力说明'],
                    ['projectCountLabel', '项目数量说明'],
                    ['systemValue', '系统数量'],
                    ['systemLabel', '系统说明'],
                    ['workflowValue', '工作流数值'],
                    ['workflowLabel', '工作流说明'],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input value={draft.about[key]} onChange={(event) => updateSection('about', key, event.target.value)} />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'archive' && (
            <div className="settings-panel">
              <div className="settings-group">
                <h3>作品档案</h3>
                <div className="settings-grid">
                  <label>
                    分区标签
                    <input value={draft.archive.kicker} onChange={(event) => updateSection('archive', 'kicker', event.target.value)} />
                  </label>
                  <label>
                    项目编号文字
                    <input value={draft.archive.projectCode} onChange={(event) => updateSection('archive', 'projectCode', event.target.value)} />
                  </label>
                  <label>
                    档案数量文字
                    <input value={draft.archive.countLabel} onChange={(event) => updateSection('archive', 'countLabel', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    分区标题
                    <input value={draft.archive.title} onChange={(event) => updateSection('archive', 'title', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    分区简介
                    <textarea rows="4" value={draft.archive.summary} onChange={(event) => updateSection('archive', 'summary', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    筛选标签（使用逗号分隔）
                    <input
                      value={draft.archive.tags.join(', ')}
                      onChange={(event) => updateSection('archive', 'tags', event.target.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))}
                    />
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h3>信息参数</h3>
                <div className="settings-grid settings-grid-3">
                  {draft.archive.specs.map((spec, index) => (
                    <div className="settings-pair" key={`spec-${index}`}>
                      <label>
                        参数名 {index + 1}
                        <input
                          value={spec.label}
                          onChange={(event) => updateArrayItem('archive', 'specs', index, { ...spec, label: event.target.value })}
                        />
                      </label>
                      <label>
                        参数值 {index + 1}
                        <input
                          value={spec.value}
                          onChange={(event) => updateArrayItem('archive', 'specs', index, { ...spec, value: event.target.value })}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <h3>暂无作品状态</h3>
                <div className="settings-grid">
                  <label>
                    状态标签
                    <input value={draft.archive.emptyKicker} onChange={(event) => updateSection('archive', 'emptyKicker', event.target.value)} />
                  </label>
                  <label>
                    状态标题
                    <input value={draft.archive.emptyTitle} onChange={(event) => updateSection('archive', 'emptyTitle', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    状态说明
                    <input value={draft.archive.emptyMeta} onChange={(event) => updateSection('archive', 'emptyMeta', event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h3>视频作品模块</h3>
                <div className="settings-grid">
                  <label>
                    分区标签
                    <input value={draft.videos.kicker} onChange={(event) => updateSection('videos', 'kicker', event.target.value)} />
                  </label>
                  <label>
                    视频编号文字
                    <input value={draft.videos.code} onChange={(event) => updateSection('videos', 'code', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    分区标题
                    <input value={draft.videos.title} onChange={(event) => updateSection('videos', 'title', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    分区简介
                    <textarea rows="3" value={draft.videos.summary} onChange={(event) => updateSection('videos', 'summary', event.target.value)} />
                  </label>
                  <label>
                    空状态标签
                    <input value={draft.videos.emptyKicker} onChange={(event) => updateSection('videos', 'emptyKicker', event.target.value)} />
                  </label>
                  <label>
                    空状态标题
                    <input value={draft.videos.emptyTitle} onChange={(event) => updateSection('videos', 'emptyTitle', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    空状态说明
                    <input value={draft.videos.emptyMeta} onChange={(event) => updateSection('videos', 'emptyMeta', event.target.value)} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'strengths' && (
            <div className="settings-panel">
              <div className="settings-group">
                <h3>个人优势</h3>
                <div className="settings-grid">
                  <label>
                    分区标签
                    <input value={draft.strengths.kicker} onChange={(event) => updateSection('strengths', 'kicker', event.target.value)} />
                  </label>
                  <label>
                    分区标题
                    <input value={draft.strengths.title} onChange={(event) => updateSection('strengths', 'title', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    分区说明
                    <textarea rows="3" value={draft.strengths.note} onChange={(event) => updateSection('strengths', 'note', event.target.value)} />
                  </label>
                </div>
                <div className="settings-card-list">
                  {draft.strengths.items.map((item, index) => (
                    <div className="settings-pair" key={`strength-${index}`}>
                      <label>
                        优势名称 {index + 1}
                        <input
                          value={item.label}
                          onChange={(event) => updateArrayItem('strengths', 'items', index, { ...item, label: event.target.value })}
                        />
                      </label>
                      <label>
                        优势说明 {index + 1}
                        <textarea
                          rows="3"
                          value={item.text}
                          onChange={(event) => updateArrayItem('strengths', 'items', index, { ...item, text: event.target.value })}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <h3>底部联系方式</h3>
                <div className="settings-grid">
                  {[
                    ['status', '合作状态'],
                    ['kicker', '联系标签'],
                    ['title1', '标题第一行'],
                    ['title2', '标题第二行'],
                    ['email', '联系邮箱'],
                    ['backTop', '返回顶部文字'],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input value={draft.contact[key]} onChange={(event) => updateSection('contact', key, event.target.value)} />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <span className="form-error content-form-error">{error}</span>}
          <div className="editor-actions content-editor-actions">
            <button type="button" onClick={onClose}>
              取消
            </button>
            <button className="admin-primary-button" type="submit" disabled={processingAvatar || saving}>
              {saving ? '正在保存…' : '保存全部修改'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function CloudMigrationBanner({ busy, status, error, onMigrate }) {
  return (
    <section className="cloud-migration-section">
      <div className="page-shell cloud-migration-inner">
        <div>
          <span>CLOUD SETUP / ONE-TIME IMPORT</span>
          <strong>将当前设备里的作品同步到云端</strong>
          <p>{error || status || '同步后即可在手机和其他电脑登录管理，所有访客会读取同一份内容。'}</p>
        </div>
        <button className="admin-primary-button" type="button" onClick={onMigrate} disabled={busy}>
          {busy ? '正在同步…' : '开始同步'}
        </button>
      </div>
    </section>
  )
}

export default function App() {
  const [projects, setProjects] = useState(loadProjects)
  const [videos, setVideos] = useState(loadVideos)
  const [content, setContent] = useState(loadContent)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [editorProject, setEditorProject] = useState(undefined)
  const [showEditor, setShowEditor] = useState(false)
  const [videoEditorItem, setVideoEditorItem] = useState(undefined)
  const [showVideoEditor, setShowVideoEditor] = useState(false)
  const [showContentEditor, setShowContentEditor] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [videoStorageError, setVideoStorageError] = useState('')
  const [contentStorageError, setContentStorageError] = useState('')
  const [cloudEmpty, setCloudEmpty] = useState(false)
  const [cloudError, setCloudError] = useState('')
  const [migrationBusy, setMigrationBusy] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState('')

  useEffect(() => {
    if (!cloudEnabled) return undefined
    let cancelled = false

    loadCloudPortfolio()
      .then((remote) => {
        if (cancelled || !remote) return
        setCloudEmpty(remote.isEmpty)
        if (!remote.isEmpty) {
          setProjects(remote.projects)
          setVideos(remote.videos)
          if (remote.content) setContent(mergeContent(remote.content))
        }
        setCloudError('')
      })
      .catch((error) => {
        if (!cancelled) setCloudError(error.message || '云端内容读取失败。')
      })

    restoreAdminSession()
      .then((restored) => {
        if (!cancelled) setIsAdmin(restored)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (cloudEnabled) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
      setStorageError('')
    } catch {
      setStorageError('保存空间不足，请使用较小的图片')
    }
  }, [projects])

  useEffect(() => {
    if (cloudEnabled) return
    try {
      window.localStorage.setItem(VIDEO_STORAGE_KEY, JSON.stringify(videos))
      setVideoStorageError('')
    } catch {
      setVideoStorageError('视频信息保存空间不足，请减少封面数量')
    }
  }, [videos])

  useEffect(() => {
    if (cloudEnabled) return
    try {
      window.localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(content))
      setContentStorageError('')
    } catch {
      setContentStorageError('网站内容保存空间不足，请上传更小的头像')
    }
  }, [content])

  useEffect(() => {
    const hasOpenModal = showLogin || showEditor || showVideoEditor
    document.body.style.overflow = hasOpenModal ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [showLogin, showEditor, showVideoEditor])

  function openEditor(project) {
    setEditorProject(project)
    setShowEditor(true)
  }

  async function saveProject(project) {
    const existingIndex = projects.findIndex((item) => item.id === project.id)
    const savedProject = cloudEnabled
      ? await saveProjectCloud(project, existingIndex >= 0 ? existingIndex : projects.length)
      : project

    setProjects((current) => {
      const exists = current.some((item) => item.id === savedProject.id)
      return exists
        ? current.map((item) => (item.id === savedProject.id ? savedProject : item))
        : [...current, savedProject]
    })
    setCloudEmpty(false)
    setShowEditor(false)
    setEditorProject(undefined)
  }

  async function deleteProject(projectId) {
    if (!window.confirm('确认删除这个项目吗？')) return
    const project = projects.find((item) => item.id === projectId)
    if (cloudEnabled && project) await deleteProjectCloud(project)
    setProjects((current) => current.filter((item) => item.id !== projectId))
  }

  function openVideoEditor(video) {
    setVideoEditorItem(video)
    setShowVideoEditor(true)
  }

  async function saveVideo(video, file, onProgress) {
    let savedVideo = video
    if (cloudEnabled) {
      const existingIndex = videos.findIndex((item) => item.id === video.id)
      savedVideo = await saveVideoCloud(
        video,
        file,
        existingIndex >= 0 ? existingIndex : videos.length,
        onProgress,
      )
    } else if (file) {
      if (navigator.storage?.persist) {
        navigator.storage.persist().catch(() => {})
      }
      await saveVideoBlob(video.id, file)
    }

    setVideos((current) => {
      const exists = current.some((item) => item.id === savedVideo.id)
      return exists
        ? current.map((item) => (item.id === savedVideo.id ? savedVideo : item))
        : [...current, savedVideo]
    })
    setCloudEmpty(false)
    setShowVideoEditor(false)
    setVideoEditorItem(undefined)
  }

  async function deleteVideo(videoId) {
    if (!window.confirm('确认删除这个视频作品吗？')) return

    try {
      const video = videos.find((item) => item.id === videoId)
      if (cloudEnabled && video) await deleteVideoCloud(video)
      else await deleteVideoBlob(videoId)
      setVideos((current) => current.filter((video) => video.id !== videoId))
      setVideoStorageError('')
    } catch (deleteError) {
      setVideoStorageError(deleteError.message)
    }
  }

  async function saveContent(nextContent) {
    const savedContent = cloudEnabled ? await saveContentCloud(nextContent) : nextContent
    setContent(mergeContent(savedContent))
    setCloudEmpty(false)
    setShowContentEditor(false)
  }

  async function migrateLocalData() {
    if (!cloudEnabled || !isAdmin || migrationBusy) return
    setMigrationBusy(true)
    setCloudError('')

    try {
      const localContent = loadContent()
      const localProjects = loadProjects()
      const localVideos = loadVideos()

      setMigrationStatus('正在同步网站文字与头像…')
      const nextContent = await saveContentCloud(localContent)

      const nextProjects = []
      for (let index = 0; index < localProjects.length; index += 1) {
        setMigrationStatus(`正在同步图片项目 ${index + 1} / ${localProjects.length}…`)
        nextProjects.push(await saveProjectCloud(localProjects[index], index))
      }

      const nextVideos = []
      for (let index = 0; index < localVideos.length; index += 1) {
        const localVideo = localVideos[index]
        const blob = await getVideoBlob(localVideo.id)
        if (!blob) throw new Error(`无法读取本机视频：${localVideo.title}`)
        const file = new File([blob], localVideo.fileName || `video-${index + 1}.mp4`, {
          type: localVideo.mimeType || blob.type || 'video/mp4',
        })
        setMigrationStatus(`正在同步视频 ${index + 1} / ${localVideos.length}…`)
        nextVideos.push(await saveVideoCloud(localVideo, file, index, (progress) => {
          setMigrationStatus(`正在同步视频 ${index + 1} / ${localVideos.length}（${progress}%）…`)
        }))
      }

      setContent(mergeContent(nextContent))
      setProjects(nextProjects)
      setVideos(nextVideos)
      setCloudEmpty(false)
      setMigrationStatus('同步完成。')
    } catch (error) {
      setCloudError(error.message || '本机数据同步失败，请重试。')
    } finally {
      setMigrationBusy(false)
    }
  }

  async function logout() {
    await signOutAdmin()
    setIsAdmin(false)
    setShowEditor(false)
    setShowVideoEditor(false)
    setShowContentEditor(false)
    setEditorProject(undefined)
    setVideoEditorItem(undefined)
  }

  return (
    <>
      <Header
        content={content}
        isAdmin={isAdmin}
        onManage={() => setShowLogin(true)}
        onEditContent={() => setShowContentEditor(true)}
        onLogout={logout}
      />
      <Hero content={content} />
      <main>
        <About content={content} projectCount={projects.length + videos.length} />
        {cloudEnabled && isAdmin && cloudEmpty && (
          <CloudMigrationBanner
            busy={migrationBusy}
            status={migrationStatus}
            error={cloudError}
            onMigrate={migrateLocalData}
          />
        )}
        <Projects
          content={content}
          projects={projects}
          isAdmin={isAdmin}
          onAdd={() => openEditor(undefined)}
          onEdit={openEditor}
          onDelete={deleteProject}
          onEditContent={() => setShowContentEditor(true)}
          storageError={storageError || contentStorageError || cloudError}
        />
        <VideoWorks
          content={content}
          videos={videos}
          isAdmin={isAdmin}
          onAdd={() => openVideoEditor(undefined)}
          onEdit={openVideoEditor}
          onDelete={deleteVideo}
          storageError={videoStorageError || cloudError}
        />
        <Strengths content={content} />
        <Contact content={content} />
      </main>

      {showLogin && (
        <AdminLogin
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setIsAdmin(true)
            setShowLogin(false)
          }}
        />
      )}

      {showEditor && (
        <ProjectEditor
          project={editorProject}
          onClose={() => {
            setShowEditor(false)
            setEditorProject(undefined)
          }}
          onSave={saveProject}
        />
      )}

      {showVideoEditor && (
        <VideoEditor
          video={videoEditorItem}
          onClose={() => {
            setShowVideoEditor(false)
            setVideoEditorItem(undefined)
          }}
          onSave={saveVideo}
        />
      )}

      {showContentEditor && (
        <SiteContentEditor
          content={content}
          onClose={() => setShowContentEditor(false)}
          onSave={saveContent}
        />
      )}
    </>
  )
}
