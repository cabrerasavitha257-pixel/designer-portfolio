import { useEffect, useRef, useState } from 'react'
import { cloudEnabled } from './lib/supabase'
import { recordSiteVisit } from './lib/visitorCounter'
import {
  deleteFeedbackMessage,
  getFeedbackIdentity,
  loadFeedbackMessages,
  setFeedbackVisibility,
  submitFeedbackMessage,
} from './lib/feedback'
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
const PROJECT_CATEGORY_DEFINITIONS = [
  { id: 'design', title: 'LISTUING设计', meta: 'IMAGE ARCHIVE', mode: 'gallery' },
  { id: 'productDetail', title: '产品详情页设计', meta: 'LONGFORM DESIGN', mode: 'longform' },
  { id: 'independentSite', title: '独立站设计', meta: 'WEB DESIGN', mode: 'longform' },
  { id: 'retouch', title: '产品精修', meta: 'BEFORE / AFTER', mode: 'compare' },
  { id: 'packaging', title: '包装设计', meta: 'PACKAGING SYSTEM', mode: 'gallery' },
  { id: 'aiModel', title: 'AI产品模特', meta: 'AIGC MODEL', mode: 'gallery' },
  { id: 'sellingPoint', title: '卖点可视化展示', meta: 'FEATURE VISUAL', mode: 'gallery' },
  { id: 'brandVi', title: '品牌VI设计', meta: 'BRAND IDENTITY', mode: 'longform' },
  { id: 'video', title: '视频作品', meta: 'MOTION ARCHIVE', mode: 'video' },
]
const LONGFORM_CATEGORY_IDS = new Set(
  PROJECT_CATEGORY_DEFINITIONS.filter((category) => category.mode === 'longform').map((category) => category.id),
)
const DEFAULT_CONTENT = {
  site: {
    title: 'Designer Portfolio',
    icon: '/assets/portrait.png',
    adminIcon: '',
  },
  admin: {
    title: '网站管理',
    tabs: {
      hero: '封面与导航',
      about: '个人资料',
      archive: '项目区域',
      folders: '分类封面',
      text: '文字样式',
      strengths: '优势与联系',
      design: '图片作品',
      productDetail: '产品详情页设计',
      independentSite: '独立站设计',
      retouch: '产品精修',
      packaging: '包装设计',
      aiModel: 'AI产品模特',
      sellingPoint: '卖点可视化展示',
      brandVi: '品牌VI设计',
      video: '视频作品',
    },
  },
  theme: {
    fontFamily: 'Inter, system-ui, sans-serif',
    customFonts: [],
    textColor: '#f3f0ea',
    mutedColor: '#929b99',
    accentColor: '#78c1b5',
    gradientEnabled: false,
    gradientStart: '#f3f0ea',
    gradientEnd: '#78c1b5',
  },
  textStyles: {},
  folders: {
    design: {
      title: 'LISTUING设计作品集',
      cover: '',
      coverPath: '',
    },
    productDetail: {
      title: '产品详情页设计',
      cover: '',
      coverPath: '',
    },
    independentSite: {
      title: '独立站设计',
      cover: '',
      coverPath: '',
    },
    retouch: {
      title: '产品精修',
      cover: '',
      coverPath: '',
    },
    packaging: {
      title: '包装设计',
      cover: '',
      coverPath: '',
    },
    aiModel: {
      title: 'AI产品模特',
      cover: '',
      coverPath: '',
    },
    sellingPoint: {
      title: '卖点可视化展示',
      cover: '',
      coverPath: '',
    },
    brandVi: {
      title: '品牌VI设计',
      cover: '',
      coverPath: '',
    },
    video: {
      title: '视频作品集',
      cover: '',
      coverPath: '',
    },
  },
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
    skillTitle: '我的核心技能',
    skillNote: '从视觉设计、AIGC 到三维渲染与商业影像，形成完整的创意执行能力。',
    skills: [
      { label: '设计与动态工具', text: 'PS、AI、Figma、C4D、Keyshot、影视动态分镜、产品建模渲染、短视频商业广告制作。' },
      { label: 'AIGC 创意工作流', text: '擅长使用即梦、Midjourney、Stable Diffusion、Nano-Banana 等 AIGC 软件，具有丰富的项目落地经验。' },
      { label: '三维渲染与电商视觉', text: '熟练掌握精修与三维渲染流程，审美感强，具有丰富的亚马逊 A+ 图设计经验。' },
      { label: '产品摄影与电商设计', text: '拥有丰富的电商设计和产品摄影棚拍经验，能够熟练使用单反相机完成产品拍摄。' },
      { label: '修图与排版设计', text: '擅长图片修图和排版设计，能够对产品修图、视觉效果、文字特效和版式进行精准处理。' },
    ],
  },
  software: {
    kicker: 'SOFTWARE STACK',
    title: '创意软件与生成工作流。',
    note: '从二维设计、三维渲染到生成式影像，以工具组合支撑完整的创意执行链路。',
    items: [
      { mark: 'Ps', name: 'Photoshop', use: '图片精修 / 视觉合成', accent: '#31a8ff' },
      { mark: 'Ai', name: 'Illustrator', use: '品牌图形 / 矢量系统', accent: '#ff9a00' },
      { mark: 'Fg', name: 'Figma', use: '界面设计 / 协作原型', accent: '#f24e1e' },
      { mark: 'C4D', name: 'Cinema 4D', use: '产品建模 / 动态视觉', accent: '#4c83ff' },
      { mark: 'Ks', name: 'KeyShot', use: '材质灯光 / 产品渲染', accent: '#7fd9c7' },
      { mark: 'JM', name: '即梦 AI', use: '生成影像 / 商业短片', accent: '#ff6f61' },
      { mark: 'MJ', name: 'Midjourney', use: '概念探索 / 视觉提案', accent: '#f2eee7' },
      { mark: 'SD', name: 'Stable Diffusion', use: '定制生成 / 节点工作流', accent: '#9d7cff' },
      { mark: 'NB', name: 'Nano Banana', use: '图像生成 / 快速迭代', accent: '#ffd34e' },
    ],
  },
  contact: {
    status: 'OPEN FOR SELECTED COLLABORATIONS',
    kicker: 'CONTACT / START A CONVERSATION',
    title1: 'Let’s make ideas',
    title2: 'visually inevitable.',
    phone: '19295569094',
    email: 'hello@portfolio.design',
    backTop: 'Back to top',
  },
}

const TEXT_STYLE_DEFAULT = {
  color: '#f3f0ea',
  opacity: 100,
  gradientEnabled: false,
  gradientStart: '#f3f0ea',
  gradientEnd: '#78c1b5',
  gradientAngle: 115,
  fontFamily: '',
  fontSize: 0,
  offsetX: 0,
  offsetY: 0,
}

const TEXT_BLOCKS = [
  ['navigation.brand', '顶部 / 标志文字'],
  ['navigation.about', '顶部 / 个人介绍导航'],
  ['navigation.projects', '顶部 / 精选项目导航'],
  ['navigation.strengths', '顶部 / 擅长技能导航'],
  ['navigation.contact', '顶部 / 联系导航'],
  ['navigation.contactAction', '顶部 / 联系按钮'],
  ['hero.eyebrow', '封面 / 身份标签'],
  ['hero.portfolioLabel', '封面 / 年份标签'],
  ['hero.title1', '封面 / 主标题第一行'],
  ['hero.title2', '封面 / 主标题第二行'],
  ['hero.title3', '封面 / 主标题第三行'],
  ['hero.intro', '封面 / 简介段落'],
  ['hero.viewWorks', '封面 / 查看作品按钮'],
  ['about.kicker', '个人 / 分区标签'],
  ['about.title', '个人 / 标题'],
  ['about.body', '个人 / 介绍段落'],
  ['archive.kicker', '作品 / 分区标签'],
  ['archive.title', '作品 / 分区标题'],
  ['archive.summary', '作品 / 分区简介'],
  ['folders.design.title', '作品 / LISTUING 分类名称'],
  ['folders.productDetail.title', '作品 / 产品详情页分类名称'],
  ['folders.independentSite.title', '作品 / 独立站分类名称'],
  ['folders.retouch.title', '作品 / 产品精修分类名称'],
  ['folders.packaging.title', '作品 / 包装设计分类名称'],
  ['folders.aiModel.title', '作品 / AI 产品模特分类名称'],
  ['folders.sellingPoint.title', '作品 / 卖点可视化分类名称'],
  ['folders.brandVi.title', '作品 / 品牌 VI 分类名称'],
  ['folders.video.title', '作品 / 视频分类名称'],
  ['strengths.kicker', '优势 / 分区标签'],
  ['strengths.title', '优势 / 标题'],
  ['strengths.note', '优势 / 说明段落'],
  ['strengths.skillTitle', '技能 / 模块标题'],
  ['strengths.skillNote', '技能 / 模块说明'],
  ['strengths.skills.0.label', '技能 / 第一项标题'],
  ['strengths.skills.0.text', '技能 / 第一项说明'],
  ['strengths.skills.1.label', '技能 / 第二项标题'],
  ['strengths.skills.1.text', '技能 / 第二项说明'],
  ['strengths.skills.2.label', '技能 / 第三项标题'],
  ['strengths.skills.2.text', '技能 / 第三项说明'],
  ['strengths.skills.3.label', '技能 / 第四项标题'],
  ['strengths.skills.3.text', '技能 / 第四项说明'],
  ['strengths.skills.4.label', '技能 / 第五项标题'],
  ['strengths.skills.4.text', '技能 / 第五项说明'],
  ['software.kicker', '软件 / 分区标签'],
  ['software.title', '软件 / 模块标题'],
  ['software.note', '软件 / 模块说明'],
  ['software.items.0.name', '软件 / Photoshop 名称'],
  ['software.items.0.use', '软件 / Photoshop 用途'],
  ['software.items.1.name', '软件 / Illustrator 名称'],
  ['software.items.1.use', '软件 / Illustrator 用途'],
  ['software.items.2.name', '软件 / Figma 名称'],
  ['software.items.2.use', '软件 / Figma 用途'],
  ['software.items.3.name', '软件 / Cinema 4D 名称'],
  ['software.items.3.use', '软件 / Cinema 4D 用途'],
  ['software.items.4.name', '软件 / KeyShot 名称'],
  ['software.items.4.use', '软件 / KeyShot 用途'],
  ['software.items.5.name', '软件 / 即梦 AI 名称'],
  ['software.items.5.use', '软件 / 即梦 AI 用途'],
  ['software.items.6.name', '软件 / Midjourney 名称'],
  ['software.items.6.use', '软件 / Midjourney 用途'],
  ['software.items.7.name', '软件 / Stable Diffusion 名称'],
  ['software.items.7.use', '软件 / Stable Diffusion 用途'],
  ['software.items.8.name', '软件 / Nano Banana 名称'],
  ['software.items.8.use', '软件 / Nano Banana 用途'],
  ['strengths.items.0.label', '优势 / 能力一标题'],
  ['strengths.items.0.text', '优势 / 能力一说明'],
  ['strengths.items.1.label', '优势 / 能力二标题'],
  ['strengths.items.1.text', '优势 / 能力二说明'],
  ['strengths.items.2.label', '优势 / 能力三标题'],
  ['strengths.items.2.text', '优势 / 能力三说明'],
  ['strengths.items.3.label', '优势 / 能力四标题'],
  ['strengths.items.3.text', '优势 / 能力四说明'],
  ['contact.status', '联系 / 当前状态'],
  ['contact.kicker', '联系 / 分区标签'],
  ['contact.title1', '联系 / 标题第一行'],
  ['contact.title2', '联系 / 标题第二行'],
]

function hexToRgba(hex, opacity = 100) {
  const value = String(hex || '#ffffff').replace('#', '')
  const normalized = value.length === 3 ? value.split('').map((item) => item + item).join('') : value
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return `rgba(255, 255, 255, ${opacity / 100})`
  const number = Number.parseInt(normalized, 16)
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${Math.max(0, Math.min(100, opacity)) / 100})`
}

function resolveTextStyle(content, key) {
  const saved = content.textStyles?.[key]
  if (!saved) return undefined
  const style = { ...TEXT_STYLE_DEFAULT, ...saved }
  const result = {
    fontFamily: style.fontFamily || undefined,
    fontSize: style.fontSize > 0 ? `${style.fontSize}px` : undefined,
    translate: `${Number(style.offsetX) || 0}px ${Number(style.offsetY) || 0}px`,
  }

  if (style.gradientEnabled) {
    result.backgroundImage = `linear-gradient(${Number(style.gradientAngle) || 0}deg, ${hexToRgba(style.gradientStart, style.opacity)}, ${hexToRgba(style.gradientEnd, style.opacity)})`
    result.backgroundClip = 'text'
    result.WebkitBackgroundClip = 'text'
    result.color = 'transparent'
  } else {
    result.color = hexToRgba(style.color, style.opacity)
  }

  return result
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })
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
    site: { ...DEFAULT_CONTENT.site, ...parsed.site },
    admin: {
      ...DEFAULT_CONTENT.admin,
      ...parsed.admin,
      tabs: { ...DEFAULT_CONTENT.admin.tabs, ...parsed.admin?.tabs },
    },
    theme: {
      ...DEFAULT_CONTENT.theme,
      ...parsed.theme,
      customFonts: parsed.theme?.customFonts || DEFAULT_CONTENT.theme.customFonts,
    },
    textStyles: { ...DEFAULT_CONTENT.textStyles, ...parsed.textStyles },
    folders: Object.fromEntries(
      Object.entries(DEFAULT_CONTENT.folders).map(([folderId, folder]) => [
        folderId,
        { ...folder, ...parsed.folders?.[folderId] },
      ]),
    ),
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
      skills: parsed.strengths?.skills || DEFAULT_CONTENT.strengths.skills,
    },
    software: {
      ...DEFAULT_CONTENT.software,
      ...parsed.software,
      items: DEFAULT_CONTENT.software.items.map((item, index) => ({
        ...item,
        ...parsed.software?.items?.[index],
      })),
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

function compressImageWithin(file, maxWidth, maxHeight, quality = 0.86) {
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
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height)
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

function compressImage(file, maxSide = 1800, quality = 0.86) {
  return compressImageWithin(file, maxSide, maxSide, quality)
}

function compressLongformImage(file) {
  return compressImageWithin(file, 1600, 14000, 0.84)
}

function FeedbackAvatar({ seed }) {
  const value = Number(seed) || 0
  const hue = value % 360
  const cells = Array.from({ length: 9 }, (_, index) => ((value >>> (index * 3)) & 1) === 1)

  return (
    <span className="feedback-avatar" style={{ '--avatar-hue': hue }} aria-label="匿名访客头像">
      {cells.map((active, index) => <i className={active ? 'is-active' : ''} key={index} />)}
    </span>
  )
}

function formatFeedbackDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function feedbackErrorMessage(error) {
  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return '留言数据表尚未初始化，请管理员完成 Supabase 配置。'
  }
  return error?.message || '留言服务暂时不可用，请稍后再试。'
}

function FeedbackPanel({ isAdmin, onClose }) {
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const identity = getFeedbackIdentity()

  async function refreshMessages() {
    setLoading(true)
    setStatus('')
    try {
      setMessages(await loadFeedbackMessages(isAdmin))
    } catch (error) {
      setStatus(feedbackErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshMessages()
  }, [isAdmin])

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setStatus('')
    try {
      await submitFeedbackMessage(message)
      setMessage('')
      setStatus('建议已提交，默认仅管理员可见。')
      if (isAdmin) await refreshMessages()
    } catch (error) {
      setStatus(feedbackErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleVisibility(item) {
    setStatus('')
    try {
      await setFeedbackVisibility(item.id, !item.is_public)
      await refreshMessages()
    } catch (error) {
      setStatus(feedbackErrorMessage(error))
    }
  }

  async function removeMessage(item) {
    if (!window.confirm('确定删除这条留言吗？')) return
    setStatus('')
    try {
      await deleteFeedbackMessage(item.id)
      await refreshMessages()
    } catch (error) {
      setStatus(feedbackErrorMessage(error))
    }
  }

  return (
    <div
      className="feedback-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="feedback-panel" role="dialog" aria-modal="false" aria-labelledby="feedback-title">
        <header>
          <div>
            <span>PORTFOLIO FEEDBACK</span>
            <h2 id="feedback-title">网站优化建议</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭留言框" title="关闭">×</button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="feedback-compose">
            <FeedbackAvatar seed={identity.seed} />
            <label>
              <span>以当前设备身份留言</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength="500"
                rows="4"
                placeholder="写下你对网站内容、排版或体验的建议…"
                required
              />
            </label>
          </div>
          <div className="feedback-submit-row">
            <small>{message.length} / 500</small>
            <button type="submit" disabled={submitting}>{submitting ? '提交中…' : '提交建议'}</button>
          </div>
        </form>

        {status && <p className="feedback-status">{status}</p>}

        <div className="feedback-list-heading">
          <span>{isAdmin ? '全部留言' : '公开留言'}</span>
          <strong>{String(messages.length).padStart(2, '0')}</strong>
        </div>
        <div className="feedback-list">
          {loading ? (
            <p className="feedback-empty">正在读取留言…</p>
          ) : messages.length > 0 ? messages.map((item) => (
            <article key={item.id}>
              <FeedbackAvatar seed={item.avatar_seed} />
              <div>
                <header>
                  <span>匿名访客</span>
                  <time>{formatFeedbackDate(item.created_at)}</time>
                </header>
                <p>{item.content}</p>
                {isAdmin && (
                  <div className="feedback-admin-actions">
                    <button type="button" onClick={() => toggleVisibility(item)}>
                      {item.is_public ? '取消公开' : '公开展示'}
                    </button>
                    <button className="is-danger" type="button" onClick={() => removeMessage(item)}>删除</button>
                  </div>
                )}
              </div>
              {isAdmin && <small className={item.is_public ? 'is-public' : ''}>{item.is_public ? 'PUBLIC' : 'PRIVATE'}</small>}
            </article>
          )) : (
            <p className="feedback-empty">{isAdmin ? '还没有收到留言。' : '暂时没有公开留言。'}</p>
          )}
        </div>
      </section>
    </div>
  )
}

function Header({ content, isAdmin, onManage, onFeedback, visitCount }) {
  const navigation = content.navigation

  return (
    <header className={`site-header${isAdmin ? ' is-admin' : ''}`}>
      <a className="signature-mark" href="#top" aria-label="姬阳作品集，返回顶部">
        <img src="/assets/jiyang-signature-transparent.png" alt="姬阳签名" />
      </a>
      <nav className="main-nav" aria-label="Primary navigation">
        <a href="#about" style={resolveTextStyle(content, 'navigation.about')}>{navigation.about}</a>
        <a href="#projects" style={resolveTextStyle(content, 'navigation.projects')}>{navigation.projects}</a>
        <a href="#strengths" style={resolveTextStyle(content, 'navigation.strengths')}>{navigation.strengths}</a>
        <a href="#contact" style={resolveTextStyle(content, 'navigation.contact')}>{navigation.contact}</a>
      </nav>
      <div className="header-actions">
        <button className="feedback-button" type="button" onClick={onFeedback}>
          <span aria-hidden="true" />
          <strong>网站优化建议</strong>
        </button>
        {visitCount !== null && (
          <div className="visit-counter header-visit-counter" aria-label={`全站访问次数 ${visitCount} 次`}>
            <span aria-hidden="true" />
            <i>全站访问次数：</i><strong>{visitCount}</strong>次
          </div>
        )}
        <button className="manage-button" type="button" onClick={onManage} aria-label="管理作品" title="管理作品">
          {content.site.adminIcon ? (
            <img src={content.site.adminIcon} alt="" />
          ) : (
            <span aria-hidden="true">⚙</span>
          )}
        </button>
      </div>
    </header>
  )
}

function Hero({ content }) {
  const hero = content.hero
  const videoRef = useRef(null)
  const [showPlayFallback, setShowPlayFallback] = useState(false)
  const heroVideoUrl = hero.videoUrl || import.meta.env.VITE_HERO_VIDEO_URL || '/assets/portfolio-motion-cover.mp4'
  const mobileHeroVideoUrl = hero.mobileVideoUrl || '/assets/portfolio-motion-cover-mobile.mp4'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    video.muted = true
    video.defaultMuted = true
    const attemptPlayback = () => {
      const playback = video.play()
      if (playback?.catch) playback.catch(() => setShowPlayFallback(true))
    }

    if (video.readyState >= 2) attemptPlayback()
    else video.addEventListener('canplay', attemptPlayback, { once: true })

    return () => video.removeEventListener('canplay', attemptPlayback)
  }, [heroVideoUrl, mobileHeroVideoUrl])

  function playHeroVideo() {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    video.play()
      .then(() => setShowPlayFallback(false))
      .catch(() => setShowPlayFallback(true))
  }

  return (
    <section className="hero" id="top">
      <video
        ref={videoRef}
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        poster="/assets/hero-poster.webp"
        onPlay={() => setShowPlayFallback(false)}
        onError={() => setShowPlayFallback(true)}
      >
        <source media="(max-width: 767px)" src={mobileHeroVideoUrl} type="video/mp4" />
        <source src={heroVideoUrl} type="video/mp4" />
      </video>
      <div className="hero-shade" />
      {showPlayFallback && (
        <button className="hero-play-fallback" type="button" onClick={playHeroVideo} aria-label="播放封面视频">
          <span aria-hidden="true" />
          播放封面
        </button>
      )}
      <div className="hero-content page-shell">
        <div className="hero-topline">
          <p className="eyebrow" style={resolveTextStyle(content, 'hero.eyebrow')}>{hero.eyebrow}</p>
          <span style={resolveTextStyle(content, 'hero.portfolioLabel')}>{hero.portfolioLabel}</span>
        </div>
        <h1>
          <span className="hero-title-line" style={resolveTextStyle(content, 'hero.title1')}>{hero.title1}</span>
          <span style={resolveTextStyle(content, 'hero.title2')}>{hero.title2}</span>
          <em style={resolveTextStyle(content, 'hero.title3')}>{hero.title3}</em>
        </h1>
        <div className="hero-lower">
          <p style={resolveTextStyle(content, 'hero.intro')}>{hero.intro}</p>
          <div className="hero-facts" aria-label="Portfolio focus">
            {hero.facts.map((fact, index) => (
              <span key={`${fact}-${index}`}>{fact}</span>
            ))}
          </div>
          <a className="primary-link" href="#projects" style={resolveTextStyle(content, 'hero.viewWorks')}>
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
            <p className="section-kicker" style={resolveTextStyle(content, 'about.kicker')}>{about.kicker}</p>
            <h2 style={resolveTextStyle(content, 'about.title')}>{about.title}</h2>
            <p style={resolveTextStyle(content, 'about.body')}>{about.body}</p>
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
      </div>
    </section>
  )
}

function ProjectGallery({ project, onClose, initialIndex = 0 }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const stageRef = useRef(null)
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
    setActiveIndex(initialIndex)
    setZoom(1)
  }, [initialIndex, project.id])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined

    const updateStageSize = () => {
      setStageSize({
        width: stage.clientWidth,
        height: stage.clientHeight,
      })
    }

    updateStageSize()
    const observer = new ResizeObserver(updateStageSize)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setZoom(1)
    stageRef.current?.scrollTo({ top: 0, left: 0 })
  }, [activeIndex])

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
      if (event.key === '+' || event.key === '=') {
        setZoom((current) => Math.min(3, Number((current + 0.25).toFixed(2))))
      }
      if (event.key === '-') {
        setZoom((current) => Math.max(0.5, Number((current - 0.25).toFixed(2))))
      }
      if (event.key === '0') setZoom(1)
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
  const changeZoom = (amount) => {
    setZoom((current) => Math.min(3, Math.max(0.5, Number((current + amount).toFixed(2)))))
  }
  const isLongImage = imageSize.width > 0 && imageSize.height / imageSize.width >= 1.35
  const availableWidth = Math.max(stageSize.width - 48, 1)
  const availableHeight = Math.max(stageSize.height - 48, 1)
  const fitScale = imageSize.width > 0
    ? (isLongImage
        ? availableWidth / imageSize.width
        : Math.min(availableWidth / imageSize.width, availableHeight / imageSize.height))
    : 1
  const renderedWidth = imageSize.width > 0 ? Math.max(1, imageSize.width * fitScale * zoom) : undefined
  const renderedHeight = imageSize.height > 0 ? Math.max(1, imageSize.height * fitScale * zoom) : undefined

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

        <div className="project-gallery-zoom-controls" aria-label="图片缩放控制">
          <button type="button" onClick={() => changeZoom(-0.25)} disabled={zoom <= 0.5} aria-label="缩小图片" title="缩小">
            −
          </button>
          <output aria-live="polite">{Math.round(zoom * 100)}%</output>
          <button type="button" onClick={() => changeZoom(0.25)} disabled={zoom >= 3} aria-label="放大图片" title="放大">
            +
          </button>
          <button type="button" onClick={() => setZoom(1)} disabled={zoom === 1} aria-label="恢复图片比例" title="恢复比例">
            ↺
          </button>
        </div>

        {images.length > 1 && (
          <>
            <button className="project-gallery-arrow is-previous" type="button" onClick={showPrevious} aria-label="上一张" title="上一张">
              ←
            </button>
            <button className="project-gallery-arrow is-next" type="button" onClick={showNext} aria-label="下一张" title="下一张">
              →
            </button>
          </>
        )}

        <div className="project-gallery-stage" ref={stageRef}>
          <div className={`project-gallery-canvas${isLongImage ? ' is-long-image' : ''}`}>
            {activeImage && (
              <img
                key={activeImage.src}
                src={activeImage.src}
                alt={activeImage.alt || `${project.title} ${activeIndex + 1}`}
                draggable="false"
                onLoad={(event) => {
                  setImageSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  })
                }}
                onDoubleClick={() => setZoom((current) => current === 1 ? 2 : 1)}
                style={{
                  width: renderedWidth ? `${renderedWidth}px` : undefined,
                  height: renderedHeight ? `${renderedHeight}px` : undefined,
                }}
              />
            )}
          </div>
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

function ProjectComparison({ project, onClose }) {
  const [position, setPosition] = useState(50)
  const galleryImages = (project.gallery || [])
    .map((item) => (typeof item === 'string' ? { src: item } : item))
    .filter((item) => item?.src)
  const beforeImage = galleryImages.length >= 2 ? galleryImages[0].src : project.image
  const afterImage = galleryImages.length >= 2 ? galleryImages[1].src : galleryImages[0]?.src || project.image
  const beforeLabel = project.beforeLabel || '精修前'
  const afterLabel = project.afterLabel || '精修后'

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') setPosition((current) => Math.max(0, current - 5))
      if (event.key === 'ArrowRight') setPosition((current) => Math.min(100, current + 5))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      className="project-comparison-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="project-comparison-panel" role="dialog" aria-modal="true" aria-label={`${project.title} 精修对比`}>
        <header className="project-comparison-header">
          <div>
            <span>BEFORE / AFTER</span>
            <strong>{project.title}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭精修对比" title="关闭">×</button>
        </header>
        <div className="project-comparison-stage" style={{ '--compare-position': `${position}%` }}>
          <img src={beforeImage} alt={`${project.title} ${beforeLabel}`} />
          <div className="project-comparison-after">
            <img src={afterImage} alt={`${project.title} ${afterLabel}`} />
          </div>
          <span className="project-comparison-label is-before">{beforeLabel}</span>
          <span className="project-comparison-label is-after">{afterLabel}</span>
          <div className="project-comparison-divider" aria-hidden="true"><i>↔</i></div>
          <input
            type="range"
            min="0"
            max="100"
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
            aria-label="拖动查看精修前后对比"
          />
        </div>
        <footer>左右拖动分界线查看对比</footer>
      </section>
    </div>
  )
}

function Projects({ content, projects, videos }) {
  const archive = content.archive
  const videoCopy = content.videos
  const videoSources = useVideoSources(videos)
  const [activeProject, setActiveProject] = useState(null)
  const [comparisonProject, setComparisonProject] = useState(null)
  const [activeVideo, setActiveVideo] = useState(null)
  const [activeCategory, setActiveCategory] = useState(null)
  const [folderOpen, setFolderOpen] = useState(false)
  const categories = PROJECT_CATEGORY_DEFINITIONS.map((definition) => {
    const categoryProjects = definition.mode === 'video'
      ? []
      : projects.filter((project) => (project.category || 'design') === definition.id)
    const categoryVideos = definition.mode === 'video' ? videos : []
    return {
      ...definition,
      label: content.folders[definition.id]?.title || definition.title,
      count: definition.mode === 'video' ? categoryVideos.length : categoryProjects.length,
      cover: content.folders[definition.id]?.cover
        || (definition.mode === 'video' ? categoryVideos[0]?.poster : categoryProjects[0]?.image),
      projects: categoryProjects,
    }
  })
  const activeCategoryInfo = categories.find((category) => category.id === activeCategory)
  const activeFolder = activeCategory ? content.folders[activeCategory] : null
  const activeProjects = activeCategoryInfo?.projects || []
  const totalCount = projects.length + videos.length
  const visibleCount = activeCategoryInfo?.count || categories.length

  function openCategory(categoryId) {
    setActiveCategory(categoryId)
    setFolderOpen(false)
  }

  function openProject(project) {
    if (activeCategoryInfo?.mode === 'compare') {
      setComparisonProject(project)
      return
    }
    setActiveProject(project)
  }

  return (
    <section className="section projects-section" id="projects">
      <div className="page-shell">
        <div className="project-heading">
          <div>
            <p className="section-kicker" style={resolveTextStyle(content, 'archive.kicker')}>{archive.kicker}</p>
            <h2 style={resolveTextStyle(content, 'archive.title')}>{archive.title}</h2>
          </div>
          <div className="project-summary">
            <p style={resolveTextStyle(content, 'archive.summary')}>{archive.summary}</p>
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

        {totalCount > 0 ? (
          <div className="project-browser">
            <aside className="project-category-panel" aria-label="作品分类">
              <div className="project-category-heading">
                <span>WORK INDEX</span>
                <h3>作品分类</h3>
              </div>
              <div className="project-category-list" role="tablist" aria-label="筛选作品分类">
                {categories.map((category) => {
                  return (
                    <button
                      className={activeCategory === category.id ? 'is-active' : ''}
                      type="button"
                      role="tab"
                      aria-selected={activeCategory === category.id}
                      key={category.id}
                      onClick={() => openCategory(category.id)}
                    >
                      <span>{category.label}</span>
                      <small>{String(category.count).padStart(2, '0')}</small>
                    </button>
                  )
                })}
              </div>
              <div className="project-category-meta">
                <span>SHOWING</span>
                <strong>
                  {String(visibleCount).padStart(2, '0')} / {String(activeCategory ? totalCount : categories.length).padStart(2, '0')}
                </strong>
              </div>
            </aside>

            <div className="project-results">
              <div className="project-results-header">
                <div>
                  {activeCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        if (folderOpen) setFolderOpen(false)
                        else setActiveCategory(null)
                      }}
                      aria-label={folderOpen ? '返回作品文件夹' : '返回作品分类'}
                    >
                      ← {folderOpen ? '返回文件夹' : '返回分类'}
                    </button>
                  )}
                  <span>{folderOpen ? activeFolder?.title : activeCategoryInfo?.label || '全部分类'}</span>
                </div>
                <p>
                  {folderOpen ? 'SELECTED WORK' : activeCategory ? 'WORK FOLDER' : 'WORK CATEGORIES'} /{' '}
                  {String(activeCategory && !folderOpen ? 1 : visibleCount).padStart(2, '0')}
                </p>
              </div>
              {!activeCategory && (
                <div className="category-overview-grid">
                  {categories.map((category) => (
                    <button
                      className="category-overview-card"
                      type="button"
                      key={category.id}
                      onClick={() => openCategory(category.id)}
                    >
                      <span className="category-overview-cover">
                        <i>{category.meta}</i>
                        {category.cover && (
                          <>
                            <img className="category-cover-backdrop" src={category.cover} alt="" aria-hidden="true" />
                            <img
                              className="category-cover-image"
                              src={category.cover}
                              alt=""
                              onError={(event) => { event.currentTarget.style.display = 'none' }}
                            />
                          </>
                        )}
                        <small>{String(category.count).padStart(2, '0')} WORKS</small>
                      </span>
                      <span className="category-overview-copy">
                        <small>{category.meta}</small>
                        <strong style={resolveTextStyle(content, `folders.${category.id}.title`)}>{content.folders[category.id].title || category.label}</strong>
                        <i>打开分类 →</i>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {activeCategory && !folderOpen && (
                <button className="work-folder-card" type="button" onClick={() => setFolderOpen(true)}>
                  <span className="work-folder-cover">
                    {(activeFolder?.cover || activeCategoryInfo?.cover) ? (
                      <>
                        <img className="work-folder-backdrop" src={activeFolder?.cover || activeCategoryInfo?.cover} alt="" aria-hidden="true" />
                        <img className="work-folder-image" src={activeFolder?.cover || activeCategoryInfo?.cover} alt="" />
                      </>
                    ) : (
                      <i>FOLDER</i>
                    )}
                    <small>OPEN FOLDER</small>
                  </span>
                  <span className="work-folder-copy">
                    <small>{activeCategoryInfo?.meta} / FOLDER 01</small>
                    <strong>{activeFolder?.title}</strong>
                    <i>{String(activeCategoryInfo?.count || 0).padStart(2, '0')} 个作品 →</i>
                  </span>
                </button>
              )}

              {activeCategoryInfo?.mode !== 'video' && activeCategory && folderOpen && (
                activeProjects.length > 0 ? (
                  <div className="project-grid">
                    {activeProjects.map((project, index) => (
                      <article className="project-card" key={project.id}>
                        <div className="project-visual">
                          <button
                            className="project-open-button"
                            type="button"
                            onClick={() => openProject(project)}
                            aria-label={activeCategoryInfo.mode === 'compare' ? `打开 ${project.title} 精修对比` : `打开 ${project.title} 项目图库`}
                          >
                            <img src={project.image} alt={project.alt || project.title} />
                            <span className="project-code">
                              {archive.projectCode} / {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="project-image-count">
                              {activeCategoryInfo.mode === 'compare'
                                ? 'BEFORE / AFTER'
                                : `${activeCategoryInfo.mode === 'longform' ? 'VIEW LONGFORM' : 'VIEW SERIES'} · ${String((project.gallery?.length || 0) + 1).padStart(2, '0')}`}
                            </span>
                          </button>
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
                  </div>
                )
              )}

              {activeCategory === 'video' && folderOpen && (
                videos.length > 0 ? (
                  <div className="video-grid project-video-grid">
                    {videos.map((video, index) => (
                      <article
                        className={`video-card${video.height > video.width ? ' is-portrait' : ' is-landscape'}`}
                        key={video.id}
                      >
                        <div className="video-cover">
                          <button className="video-cover-button" type="button" onClick={() => setActiveVideo(video)}>
                            {video.poster ? <img src={video.poster} alt="" /> : <span className="video-cover-fallback">MOTION ARCHIVE</span>}
                            <span className="video-code">{videoCopy.code} / {String(index + 1).padStart(2, '0')}</span>
                            <span className="video-cover-play" aria-hidden="true"><i /></span>
                            <span className="video-cover-action">
                              <small>OPEN FILM</small>
                              <b>{formatDuration(video.duration)}</b>
                            </span>
                          </button>
                          {!videoSources[video.id] && <div className="video-source-status"><span>LOADING VIDEO</span></div>}
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
                    <p>{videoCopy.emptyKicker}</p>
                    <h3>{videoCopy.emptyTitle}</h3>
                    <span>{videoCopy.emptyMeta}</span>
                  </div>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="archive-empty">
            <p>{archive.emptyKicker}</p>
            <h3>{archive.emptyTitle}</h3>
            <span>{archive.emptyMeta}</span>
          </div>
        )}
      </div>
      {activeProject && (
        <ProjectGallery
          project={activeProject}
          initialIndex={LONGFORM_CATEGORY_IDS.has(activeProject.category) && activeProject.gallery?.length ? 1 : 0}
          onClose={() => setActiveProject(null)}
        />
      )}
      {comparisonProject && (
        <ProjectComparison project={comparisonProject} onClose={() => setComparisonProject(null)} />
      )}
      {activeVideo && (
        <VideoViewer
          video={activeVideo}
          source={videoSources[activeVideo.id]}
          onClose={() => setActiveVideo(null)}
        />
      )}
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

function VideoWorks({ content, videos }) {
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
  const skills = strengths.skills || []

  return (
    <section className="section strengths-section" id="strengths">
      <div className="page-shell">
        <div className="section-heading">
          <div>
            <p className="section-kicker" style={resolveTextStyle(content, 'strengths.kicker')}>{strengths.kicker}</p>
            <h2 style={resolveTextStyle(content, 'strengths.skillTitle')}>{strengths.skillTitle}</h2>
          </div>
          <p className="section-note" style={resolveTextStyle(content, 'strengths.skillNote')}>{strengths.skillNote}</p>
        </div>
        <div className="skill-list">
          {skills.map((item, index) => (
            <article className="skill-row" key={`${item.label}-${index}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3 style={resolveTextStyle(content, `strengths.skills.${index}.label`)}>{item.label}</h3>
              <p style={resolveTextStyle(content, `strengths.skills.${index}.text`)}>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function SoftwareStack({ content }) {
  const sectionRef = useRef(null)
  const software = content.software

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add('is-visible')
          observer.disconnect()
        }
      },
      { threshold: 0.16 },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="section software-section" ref={sectionRef} aria-labelledby="software-title">
      <div className="page-shell">
        <div className="section-heading software-heading">
          <div>
            <p className="section-kicker" style={resolveTextStyle(content, 'software.kicker')}>{software.kicker}</p>
            <h2 id="software-title" style={resolveTextStyle(content, 'software.title')}>{software.title}</h2>
          </div>
          <p className="section-note" style={resolveTextStyle(content, 'software.note')}>{software.note}</p>
        </div>

        <div className="software-grid">
          {software.items.map((item, index) => (
            <article
              className="software-card"
              key={`${item.name}-${index}`}
              style={{ '--software-accent': item.accent, '--software-index': index }}
            >
              <span className="software-mark" aria-hidden="true">{item.mark}</span>
              <div>
                <h3 style={resolveTextStyle(content, `software.items.${index}.name`)}>{item.name}</h3>
                <p style={resolveTextStyle(content, `software.items.${index}.use`)}>{item.use}</p>
              </div>
              <span className="software-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            </article>
          ))}
        </div>

        <div className="software-marquee" aria-hidden="true">
          <div>
            {[...software.items, ...software.items].map((item, index) => (
              <span key={`${item.name}-marquee-${index}`}>{item.name}</span>
            ))}
          </div>
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
          <div className="contact-status" style={resolveTextStyle(content, 'contact.status')}>
            <span aria-hidden="true" />
            {contact.status}
          </div>
          <p className="section-kicker" style={resolveTextStyle(content, 'contact.kicker')}>{contact.kicker}</p>
          <h2>
            <span style={resolveTextStyle(content, 'contact.title1')}>{contact.title1}</span>
            <em style={resolveTextStyle(content, 'contact.title2')}>{contact.title2}</em>
          </h2>
        </div>
        <div className="contact-actions">
          <a href={`tel:${contact.phone}`}>{contact.phone}</a>
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

function AdminDashboard({
  projects,
  videos,
  status,
  cloudEmpty,
  migrationBusy,
  migrationStatus,
  onMigrate,
  onClose,
  onEditContent,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onAddVideo,
  onEditVideo,
  onDeleteVideo,
  onLogout,
}) {
  return (
    <div className="modal-backdrop admin-dashboard-backdrop" role="presentation">
      <section className="admin-dashboard-modal" role="dialog" aria-modal="true" aria-labelledby="admin-dashboard-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="关闭" title="关闭">
          ×
        </button>
        <p className="modal-kicker">PORTFOLIO MANAGEMENT</p>
        <h2 id="admin-dashboard-title">作品管理</h2>

        <div className="admin-dashboard-summary">
          <div>
            <strong>{String(projects.length).padStart(2, '0')}</strong>
            <span>图片项目</span>
          </div>
          <div>
            <strong>{String(videos.length).padStart(2, '0')}</strong>
            <span>视频作品</span>
          </div>
          <div>
            <strong>{String(projects.length + videos.length).padStart(2, '0')}</strong>
            <span>全部档案</span>
          </div>
        </div>

        <div className="admin-dashboard-actions">
          <button type="button" onClick={onEditContent}>
            <span>CONTENT</span>
            <strong>编辑网站内容</strong>
          </button>
          <button type="button" onClick={() => onAddProject('design')}>
            <span>PROJECT</span>
            <strong>新增图片项目</strong>
          </button>
          <button type="button" onClick={onAddVideo}>
            <span>MOTION</span>
            <strong>上传视频作品</strong>
          </button>
        </div>

        {(status || cloudEmpty) && (
          <div className="admin-dashboard-notice">
            <div>
              <strong>{cloudEmpty ? '云端内容尚未初始化' : '管理提示'}</strong>
              <span>{status || migrationStatus || '可将当前设备中的内容同步到云端。'}</span>
            </div>
            {cloudEmpty && (
              <button type="button" onClick={onMigrate} disabled={migrationBusy}>
                {migrationBusy ? '同步中…' : '同步本机内容'}
              </button>
            )}
          </div>
        )}

        <div className="admin-dashboard-columns">
          <section className="admin-dashboard-list" aria-labelledby="project-management-title">
            <header>
              <div>
                <span>PROJECT ARCHIVE</span>
                <h3 id="project-management-title">图片项目</h3>
              </div>
              <button type="button" onClick={() => onAddProject('design')}>新增</button>
            </header>
            <div>
              {projects.length > 0 ? projects.map((project, index) => (
                <article key={project.id}>
                  <img src={project.image} alt="" />
                  <div>
                    <span>{String(index + 1).padStart(2, '0')} · {project.year || '2026'}</span>
                    <strong>{project.title}</strong>
                    <small>{(project.gallery?.length || 0) + 1} 张图片</small>
                  </div>
                  <div className="admin-dashboard-item-actions">
                    <button type="button" onClick={() => onEditProject(project)}>编辑</button>
                    <button className="is-danger" type="button" onClick={() => onDeleteProject(project.id)}>删除</button>
                  </div>
                </article>
              )) : <p>暂无图片项目</p>}
            </div>
          </section>

          <section className="admin-dashboard-list" aria-labelledby="video-management-title">
            <header>
              <div>
                <span>MOTION ARCHIVE</span>
                <h3 id="video-management-title">视频作品</h3>
              </div>
              <button type="button" onClick={onAddVideo}>上传</button>
            </header>
            <div>
              {videos.length > 0 ? videos.map((video, index) => (
                <article key={video.id}>
                  {video.poster ? <img src={video.poster} alt="" /> : <span className="admin-dashboard-video-placeholder">VIDEO</span>}
                  <div>
                    <span>{String(index + 1).padStart(2, '0')} · {video.year || '2026'}</span>
                    <strong>{video.title}</strong>
                    <small>{video.duration ? formatDuration(video.duration) : '视频作品'}</small>
                  </div>
                  <div className="admin-dashboard-item-actions">
                    <button type="button" onClick={() => onEditVideo(video)}>编辑</button>
                    <button className="is-danger" type="button" onClick={() => onDeleteVideo(video.id)}>删除</button>
                  </div>
                </article>
              )) : <p>暂无视频作品</p>}
            </div>
          </section>
        </div>

        <footer className="admin-dashboard-footer">
          <span>所有管理操作已从作品主页移至此处</span>
          <button type="button" onClick={onLogout}>退出管理</button>
        </footer>
      </section>
    </div>
  )
}

function ProjectEditor({ project, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    title: project?.title || '',
    type: project?.type || 'Visual Design',
    category: project?.category || 'design',
    year: project?.year || '2026',
    description: project?.description || '',
    beforeLabel: project?.beforeLabel || '精修前',
    afterLabel: project?.afterLabel || '精修后',
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
  const [draggedGalleryId, setDraggedGalleryId] = useState('')

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
          src: LONGFORM_CATEGORY_IDS.has(form.category)
            ? await compressLongformImage(file)
            : await compressImage(file, 2000, 0.88),
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

  function moveGalleryImage(targetId, sourceId = draggedGalleryId) {
    if (!sourceId || sourceId === targetId) return
    setForm((current) => {
      const sourceIndex = current.gallery.findIndex((item) => item.id === sourceId)
      const targetIndex = current.gallery.findIndex((item) => item.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0) return current
      const gallery = [...current.gallery]
      const [moved] = gallery.splice(sourceIndex, 1)
      gallery.splice(targetIndex, 0, moved)
      return { ...current, gallery }
    })
    setDraggedGalleryId('')
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
        <h2 id="editor-title">{project?.id ? '编辑项目' : '新增项目'}</h2>
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
              作品分类
              <select name="category" value={form.category} onChange={updateField}>
                {PROJECT_CATEGORY_DEFINITIONS.filter((category) => category.mode !== 'video').map((category) => (
                  <option value={category.id} key={category.id}>{category.title}</option>
                ))}
              </select>
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
              {form.category === 'retouch' ? '添加精修前后对比图' : '批量添加项目内页图片'}
              <input type="file" accept="image/*" multiple onChange={handleGalleryFiles} />
            </label>
            {form.category === 'retouch' && (
              <>
                <label>
                  左侧标签
                  <input name="beforeLabel" value={form.beforeLabel} onChange={updateField} />
                </label>
                <label>
                  右侧标签
                  <input name="afterLabel" value={form.afterLabel} onChange={updateField} />
                </label>
              </>
            )}
          </div>

          {LONGFORM_CATEGORY_IDS.has(form.category) && (
            <p className="editor-mode-note">此分类支持长图。项目封面保持横版或方图，长图请添加到项目内页，打开项目后可上下滚动查看。</p>
          )}
          {form.category === 'retouch' && (
            <p className="editor-mode-note">上传两张内页图时，第 1 张为精修前、第 2 张为精修后；若只上传一张内页图，则项目封面作为精修前。</p>
          )}

          {form.image && (
            <div className="editor-preview">
              <img src={form.image} alt="项目图片预览" />
            </div>
          )}
          {form.gallery.length > 0 && (
            <div className="editor-gallery">
              <div className="editor-gallery-heading">
                <strong>项目内页</strong>
                <span>{form.gallery.length} 张 · 按住缩略图左右拖动调整顺序</span>
              </div>
              <div className="editor-gallery-grid">
                {form.gallery.map((item, index) => (
                  <div
                    className={`editor-gallery-item${draggedGalleryId === item.id ? ' is-dragging' : ''}`}
                    key={item.id}
                    draggable
                    onDragStart={(event) => {
                      setDraggedGalleryId(item.id)
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', item.id)
                    }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      moveGalleryImage(item.id, event.dataTransfer.getData('text/plain'))
                    }}
                    onDragEnd={() => setDraggedGalleryId('')}
                    title="按住图片并左右拖动调整顺序"
                  >
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

function TextAppearanceEditor({ value, onChange, onReset, fontOptions }) {
  const [open, setOpen] = useState(false)
  const [draggingPosition, setDraggingPosition] = useState(false)
  const style = { ...TEXT_STYLE_DEFAULT, ...value }
  const update = (key, nextValue) => onChange({ ...style, [key]: nextValue })

  function updatePosition(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const offsetX = Math.round(((event.clientX - rect.left) / rect.width - 0.5) * 600)
    const offsetY = Math.round(((event.clientY - rect.top) / rect.height - 0.5) * 600)
    onChange({ ...style, offsetX: Math.max(-300, Math.min(300, offsetX)), offsetY: Math.max(-300, Math.min(300, offsetY)) })
  }

  return (
    <div className="text-appearance-editor">
      <button className="text-color-trigger" type="button" onClick={() => setOpen((current) => !current)}>
        <span style={{ background: hexToRgba(style.color, style.opacity) }} />
        <strong>{style.color.toUpperCase()}</strong>
        <small>{style.opacity}%</small>
      </button>

      {open && (
        <div className="text-style-popover">
          <div className="text-color-stage" style={{ background: hexToRgba(style.color, style.opacity) }}>
            <input
              type="color"
              value={style.color}
              onChange={(event) => update('color', event.target.value)}
              aria-label="选择文字颜色"
            />
          </div>
          <div className="text-style-row is-color-value">
            <label>
              HEX
              <input value={style.color} onChange={(event) => update('color', event.target.value)} />
            </label>
            <label>
              透明度
              <input
                type="number"
                min="0"
                max="100"
                value={style.opacity}
                onChange={(event) => update('opacity', Number(event.target.value))}
              />
            </label>
          </div>
          <label className="text-style-range">
            <span>颜色透明度</span>
            <input type="range" min="0" max="100" value={style.opacity} onChange={(event) => update('opacity', Number(event.target.value))} />
          </label>

          <label className="theme-toggle-field text-gradient-toggle">
            <input type="checkbox" checked={style.gradientEnabled} onChange={(event) => update('gradientEnabled', event.target.checked)} />
            <span>启用这段文字的渐变</span>
          </label>

          {style.gradientEnabled && (
            <div className="text-gradient-controls">
              <label>
                起始颜色
                <span><input type="color" value={style.gradientStart} onChange={(event) => update('gradientStart', event.target.value)} /><input value={style.gradientStart} onChange={(event) => update('gradientStart', event.target.value)} /></span>
              </label>
              <label>
                结束颜色
                <span><input type="color" value={style.gradientEnd} onChange={(event) => update('gradientEnd', event.target.value)} /><input value={style.gradientEnd} onChange={(event) => update('gradientEnd', event.target.value)} /></span>
              </label>
              <label>
                渐变角度
                <input type="number" min="0" max="360" value={style.gradientAngle} onChange={(event) => update('gradientAngle', Number(event.target.value))} />
              </label>
            </div>
          )}

          <label className="text-style-font">
            字体
            <select value={style.fontFamily} onChange={(event) => update('fontFamily', event.target.value)}>
              <option value="">继承全站字体</option>
              {fontOptions.map((font) => <option value={font.value} key={font.value}>{font.label}</option>)}
            </select>
          </label>

          <div className="text-style-row text-layout-controls">
            <label>
              字号
              <input type="number" min="0" max="240" value={style.fontSize} onChange={(event) => update('fontSize', Number(event.target.value))} />
            </label>
            <label>
              水平移动
              <input type="number" min="-300" max="300" value={style.offsetX} onChange={(event) => update('offsetX', Number(event.target.value))} />
            </label>
            <label>
              垂直移动
              <input type="number" min="-300" max="300" value={style.offsetY} onChange={(event) => update('offsetY', Number(event.target.value))} />
            </label>
          </div>
          <div className="text-position-control">
            <span>拖动调整文字位置</span>
            <div
              className="text-position-pad"
              onPointerDown={(event) => {
                setDraggingPosition(true)
                event.currentTarget.setPointerCapture(event.pointerId)
                updatePosition(event)
              }}
              onPointerMove={(event) => {
                if (draggingPosition) updatePosition(event)
              }}
              onPointerUp={(event) => {
                setDraggingPosition(false)
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
              }}
              onPointerCancel={() => setDraggingPosition(false)}
            >
              <i style={{ left: `${((Number(style.offsetX) || 0) + 300) / 6}%`, top: `${((Number(style.offsetY) || 0) + 300) / 6}%` }} />
            </div>
          </div>
          <p className="text-style-hint">字号填 0 表示沿用原版式；位置数值可正负调整，手机端会自动关闭位移以避免重叠。</p>
          <button className="text-style-reset" type="button" onClick={onReset}>恢复这段文字的默认样式</button>
        </div>
      )}
    </div>
  )
}

const CONTENT_CORE_TABS = [
  ['hero', 'hero'],
  ['about', 'about'],
  ['archive', 'archive'],
  ['folders', 'folders'],
  ['text', 'text'],
  ['strengths', 'strengths'],
]

function projectManagementTabId(categoryId) {
  return categoryId === 'design' ? 'projects' : `projects-${categoryId}`
}

function SiteContentEditor({
  content,
  projects,
  videos,
  status,
  cloudEmpty,
  migrationBusy,
  migrationStatus,
  onMigrate,
  onClose,
  onSave,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onAddVideo,
  onEditVideo,
  onDeleteVideo,
  onLogout,
}) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(content)))
  const [activeTab, setActiveTab] = useState('hero')
  const [error, setError] = useState('')
  const [processingAvatar, setProcessingAvatar] = useState(false)
  const [processingSiteIcon, setProcessingSiteIcon] = useState(false)
  const [processingAdminIcon, setProcessingAdminIcon] = useState(false)
  const [processingFolderCover, setProcessingFolderCover] = useState('')
  const [processingFont, setProcessingFont] = useState(false)
  const [selectedTextKey, setSelectedTextKey] = useState(TEXT_BLOCKS[0][0])
  const [saving, setSaving] = useState(false)
  const [saveNotice, setSaveNotice] = useState('')
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

  function updateAdminTab(tabKey, value) {
    setDraft((current) => ({
      ...current,
      admin: {
        ...current.admin,
        tabs: { ...current.admin.tabs, [tabKey]: value },
      },
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

  function updateFolder(folderId, key, value) {
    setDraft((current) => ({
      ...current,
      folders: {
        ...current.folders,
        [folderId]: { ...current.folders[folderId], [key]: value },
      },
    }))
  }

  function updateTextStyle(textKey, value) {
    setDraft((current) => ({
      ...current,
      textStyles: {
        ...current.textStyles,
        [textKey]: value,
      },
    }))
  }

  function resetTextStyle(textKey) {
    setDraft((current) => {
      const nextStyles = { ...current.textStyles }
      delete nextStyles[textKey]
      return { ...current, textStyles: nextStyles }
    })
  }

  async function handleFontUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('字体文件请控制在 5MB 以内。')
      return
    }

    setProcessingFont(true)
    setError('')
    try {
      const src = await readFileAsDataUrl(file)
      const id = `font-${Date.now()}`
      const family = `PortfolioFont-${id}`
      setDraft((current) => ({
        ...current,
        theme: {
          ...current.theme,
          customFonts: [...(current.theme.customFonts || []), { id, name: file.name.replace(/\.[^.]+$/, ''), family, src, path: '' }],
        },
      }))
    } catch (fontError) {
      setError(fontError.message)
    } finally {
      setProcessingFont(false)
      event.target.value = ''
    }
  }

  function removeCustomFont(fontId) {
    setDraft((current) => ({
      ...current,
      theme: {
        ...current.theme,
        customFonts: (current.theme.customFonts || []).filter((font) => font.id !== fontId),
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

  async function handleSiteIcon(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setProcessingSiteIcon(true)
    setError('')
    try {
      const icon = await compressImage(file, 256, 0.9)
      updateSection('site', 'icon', icon)
    } catch (imageError) {
      setError(imageError.message)
    } finally {
      setProcessingSiteIcon(false)
    }
  }

  async function handleAdminIcon(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setProcessingAdminIcon(true)
    setError('')
    try {
      const icon = await compressImage(file, 256, 0.9)
      updateSection('site', 'adminIcon', icon)
    } catch (imageError) {
      setError(imageError.message)
    } finally {
      setProcessingAdminIcon(false)
    }
  }

  async function handleFolderCover(event, folderId) {
    const file = event.target.files?.[0]
    if (!file) return

    setProcessingFolderCover(folderId)
    setError('')
    try {
      const cover = await compressImage(file, 1600, 0.86)
      updateFolder(folderId, 'cover', cover)
    } catch (imageError) {
      setError(imageError.message)
    } finally {
      setProcessingFolderCover('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSaveNotice('')
    try {
      await onSave(draft)
      setSaveNotice('保存成功，管理窗口将继续保持打开。')
    } catch (saveError) {
      setError(saveError.message || '网站内容保存失败，请重试。')
    } finally {
      setSaving(false)
    }
  }

  const fontOptions = [
    { label: '现代无衬线', value: 'Inter, system-ui, sans-serif' },
    { label: '中文黑体', value: "'Microsoft YaHei', 'PingFang SC', sans-serif" },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: '经典衬线', value: "Georgia, 'Times New Roman', serif" },
    { label: '等宽科技字体', value: "'Courier New', monospace" },
    ...(draft.theme.customFonts || []).map((font) => ({ label: `自定义 / ${font.name}`, value: `'${font.family}'` })),
  ]
  const imageCategoryDefinitions = PROJECT_CATEGORY_DEFINITIONS.filter((category) => category.mode !== 'video')
  const contentTabs = [
    ...CONTENT_CORE_TABS.map(([id, tabKey]) => ({
      id,
      label: draft.admin.tabs[tabKey] || DEFAULT_CONTENT.admin.tabs[tabKey],
    })),
    ...imageCategoryDefinitions.map((category) => ({
      id: projectManagementTabId(category.id),
      label: draft.admin.tabs[category.id] || draft.folders[category.id]?.title || category.title,
    })),
    {
      id: 'videos',
      label: draft.admin.tabs.video || draft.folders.video?.title || '视频作品',
    },
  ]
  const activeProjectCategory = imageCategoryDefinitions.find(
    (category) => projectManagementTabId(category.id) === activeTab,
  )
  const activeCategoryProjects = activeProjectCategory
    ? projects.filter((project) => (project.category || 'design') === activeProjectCategory.id)
    : []
  const isManagementTab = Boolean(activeProjectCategory || activeTab === 'videos')

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
          <div className="management-title">
            <span className="management-title-icon" aria-hidden="true">
              {draft.site.adminIcon ? <img src={draft.site.adminIcon} alt="" /> : '⚙'}
            </span>
            <div>
              <p className="modal-kicker">SITE CONTENT EDITOR</p>
              <h2 id="content-editor-title">{draft.admin.title}</h2>
            </div>
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
          {contentTabs.map(({ id, label }) => (
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

        {(status || cloudEmpty) && (
          <div className="admin-dashboard-notice management-center-notice">
            <div>
              <strong>{cloudEmpty ? '云端内容尚未初始化' : '管理提示'}</strong>
              <span>{status || migrationStatus || '可将当前设备中的内容同步到云端。'}</span>
            </div>
            {cloudEmpty && (
              <button type="button" onClick={onMigrate} disabled={migrationBusy}>
                {migrationBusy ? '同步中…' : '同步本机内容'}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="content-editor-scroll">
          {activeTab === 'hero' && (
            <div className="settings-panel">
              <div className="settings-group">
                <h3>网站名称与图标</h3>
                <div className="site-identity-editor">
                  <label className="site-title-field">
                    浏览器标签名称
                    <input
                      value={draft.site.title}
                      onChange={(event) => updateSection('site', 'title', event.target.value)}
                      placeholder="Designer Portfolio"
                    />
                  </label>
                  <div className="site-icon-control">
                    <div className="site-icon-preview">
                      <img src={draft.site.icon} alt="网站图标预览" />
                    </div>
                    <label className="file-field">
                      上传网站图标
                      <input type="file" accept="image/*" onChange={handleSiteIcon} />
                      <span>{processingSiteIcon ? '正在处理图标…' : '建议使用正方形 PNG、JPG 或 WebP'}</span>
                    </label>
                  </div>
                  <div className="site-icon-control">
                    <div className="site-icon-preview">
                      {draft.site.adminIcon ? (
                        <img src={draft.site.adminIcon} alt="管理入口图标预览" />
                      ) : (
                        <span className="site-icon-fallback" aria-hidden="true">⚙</span>
                      )}
                    </div>
                    <label className="file-field">
                      上传管理入口图标
                      <input type="file" accept="image/*" onChange={handleAdminIcon} />
                      <span>{processingAdminIcon ? '正在处理图标…' : '显示在网站顶部，建议使用简洁正方形图标'}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h3>管理模块名称</h3>
                <p className="settings-description">这里只修改管理窗口中的显示文字，不会改变模块功能、作品分类或网站内容。</p>
                <div className="settings-grid settings-grid-3">
                  <label>
                    管理窗口标题
                    <input value={draft.admin.title} onChange={(event) => updateSection('admin', 'title', event.target.value)} />
                  </label>
                  {[
                    ...CONTENT_CORE_TABS.map(([, tabKey]) => [tabKey, DEFAULT_CONTENT.admin.tabs[tabKey]]),
                    ...PROJECT_CATEGORY_DEFINITIONS.map((category) => [category.id, category.title]),
                  ].map(([tabKey, fallbackLabel]) => (
                    <label key={tabKey}>
                      {fallbackLabel}模块
                      <input
                        value={draft.admin.tabs[tabKey] || ''}
                        onChange={(event) => updateAdminTab(tabKey, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <h3>全站文字样式</h3>
                <div className="settings-grid theme-settings-grid">
                  <label className="settings-field-wide">
                    全站字体
                    <select value={draft.theme.fontFamily} onChange={(event) => updateSection('theme', 'fontFamily', event.target.value)}>
                      <option value="Inter, system-ui, sans-serif">现代无衬线</option>
                      <option value="'Microsoft YaHei', 'PingFang SC', sans-serif">中文黑体</option>
                      <option value="Arial, Helvetica, sans-serif">Arial</option>
                      <option value="Georgia, 'Times New Roman', serif">经典衬线</option>
                      <option value="'Courier New', monospace">等宽科技字体</option>
                      {(draft.theme.customFonts || []).map((font) => (
                        <option value={`'${font.family}'`} key={font.id}>自定义 / {font.name}</option>
                      ))}
                    </select>
                  </label>
                  {[
                    ['textColor', '主文字颜色'],
                    ['mutedColor', '辅助文字颜色'],
                    ['accentColor', '强调文字颜色'],
                    ['gradientStart', '渐变起始颜色'],
                    ['gradientEnd', '渐变结束颜色'],
                  ].map(([key, label]) => (
                    <label className="theme-color-field" key={key}>
                      {label}
                      <span>
                        <input type="color" value={draft.theme[key]} onChange={(event) => updateSection('theme', key, event.target.value)} />
                        <input value={draft.theme[key]} onChange={(event) => updateSection('theme', key, event.target.value)} />
                      </span>
                    </label>
                  ))}
                  <label className="theme-toggle-field">
                    <input
                      type="checkbox"
                      checked={draft.theme.gradientEnabled}
                      onChange={(event) => updateSection('theme', 'gradientEnabled', event.target.checked)}
                    />
                    <span>启用全站大标题渐变</span>
                  </label>
                </div>
              </div>

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

          {activeTab === 'folders' && (
            <div className="settings-panel">
              <div className="settings-group folder-cover-management">
                <p className="settings-eyebrow">CATEGORY MODULE COVERS</p>
                <h3>分类模块封面</h3>
                <p className="settings-description">这里只修改作品首页的分类模块封面，不会修改打开文件夹后的任何作品封面。</p>
                <div className="folder-settings-grid">
                  {PROJECT_CATEGORY_DEFINITIONS.map((category) => {
                    const fallbackCover = category.mode === 'video'
                      ? videos[0]?.poster
                      : projects.find((project) => (project.category || 'design') === category.id)?.image
                    return [category.id, `${category.title}模块`, fallbackCover]
                  }).map(([folderId, label, fallbackCover]) => (
                    <div className="folder-setting-card" key={folderId}>
                      <div className="folder-cover-preview">
                        {(draft.folders[folderId].cover || fallbackCover) ? (
                          <img src={draft.folders[folderId].cover || fallbackCover} alt="" />
                        ) : (
                          <span>FOLDER</span>
                        )}
                      </div>
                      <label>
                        {label}名称
                        <input value={draft.folders[folderId].title} onChange={(event) => updateFolder(folderId, 'title', event.target.value)} />
                      </label>
                      <label className="file-field folder-cover-upload">
                        更换这个分类模块的封面
                        <input type="file" accept="image/*" onChange={(event) => handleFolderCover(event, folderId)} />
                        <span>{processingFolderCover === folderId ? '正在处理封面…' : '仅影响外层分类卡片，图片将完整展示'}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="settings-panel">
              <div className="settings-group font-library-panel">
                <p className="settings-eyebrow">FONT LIBRARY</p>
                <h3>字体库</h3>
                <p className="settings-description">上传后的字体会随网站内容保存，可在每段文字的字体选项中随时替换。</p>
                <label className="file-field font-upload-field">
                  上传字体文件
                  <input type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" onChange={handleFontUpload} />
                  <span>{processingFont ? '正在读取字体…' : '支持 WOFF、WOFF2、TTF、OTF，单个不超过 5MB'}</span>
                </label>
                {(draft.theme.customFonts || []).length > 0 && (
                  <div className="custom-font-list">
                    {draft.theme.customFonts.map((font) => (
                      <div key={font.id}>
                        <span style={{ fontFamily: `'${font.family}'` }}>{font.name}</span>
                        <button type="button" onClick={() => removeCustomFont(font.id)}>移除</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="settings-group per-text-style-panel">
                <p className="settings-eyebrow">PER TEXT STYLE</p>
                <h3>逐段文字样式</h3>
                <label className="text-block-selector">
                  选择要修改的文字
                  <select value={selectedTextKey} onChange={(event) => setSelectedTextKey(event.target.value)}>
                    {TEXT_BLOCKS.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
                  </select>
                </label>
                <TextAppearanceEditor
                  value={draft.textStyles?.[selectedTextKey]}
                  onChange={(value) => updateTextStyle(selectedTextKey, value)}
                  onReset={() => resetTextStyle(selectedTextKey)}
                  fontOptions={fontOptions}
                />
              </div>
            </div>
          )}

          {activeTab === 'strengths' && (
            <div className="settings-panel">
              <div className="settings-group">
                <h3>核心技能</h3>
                <div className="settings-grid">
                  <label>
                    分区标签
                    <input value={draft.strengths.kicker} onChange={(event) => updateSection('strengths', 'kicker', event.target.value)} />
                  </label>
                  <label>
                    技能模块标题
                    <input value={draft.strengths.skillTitle} onChange={(event) => updateSection('strengths', 'skillTitle', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    技能模块说明
                    <textarea rows="3" value={draft.strengths.skillNote} onChange={(event) => updateSection('strengths', 'skillNote', event.target.value)} />
                  </label>
                </div>
                <div className="settings-card-list">
                  {draft.strengths.skills.map((item, index) => (
                    <div className="settings-pair" key={`skill-${index}`}>
                      <label>
                        技能名称 {index + 1}
                        <input
                          value={item.label}
                          onChange={(event) => updateArrayItem('strengths', 'skills', index, { ...item, label: event.target.value })}
                        />
                      </label>
                      <label>
                        技能说明 {index + 1}
                        <textarea
                          rows="3"
                          value={item.text}
                          onChange={(event) => updateArrayItem('strengths', 'skills', index, { ...item, text: event.target.value })}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <h3>软件展示模块</h3>
                <div className="settings-grid">
                  <label>
                    分区标签
                    <input value={draft.software.kicker} onChange={(event) => updateSection('software', 'kicker', event.target.value)} />
                  </label>
                  <label>
                    模块标题
                    <input value={draft.software.title} onChange={(event) => updateSection('software', 'title', event.target.value)} />
                  </label>
                  <label className="settings-field-wide">
                    模块说明
                    <textarea rows="3" value={draft.software.note} onChange={(event) => updateSection('software', 'note', event.target.value)} />
                  </label>
                </div>
                <div className="settings-card-list software-settings-list">
                  {draft.software.items.map((item, index) => (
                    <div className="settings-pair" key={`software-${index}`}>
                      <label>
                        软件名称 {index + 1}
                        <input
                          value={item.name}
                          onChange={(event) => updateArrayItem('software', 'items', index, { ...item, name: event.target.value })}
                        />
                      </label>
                      <label>
                        主要用途 {index + 1}
                        <input
                          value={item.use}
                          onChange={(event) => updateArrayItem('software', 'items', index, { ...item, use: event.target.value })}
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
                    ['phone', '联系电话'],
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

          {activeProjectCategory && (
            <div className="settings-panel management-settings-panel">
              <section className="admin-dashboard-list" aria-labelledby={`content-project-management-title-${activeProjectCategory.id}`}>
                <header>
                  <div>
                    <span>{activeProjectCategory.meta}</span>
                    <h3 id={`content-project-management-title-${activeProjectCategory.id}`}>
                      {draft.admin.tabs[activeProjectCategory.id] || draft.folders[activeProjectCategory.id]?.title}
                    </h3>
                  </div>
                  <button type="button" onClick={() => onAddProject(activeProjectCategory.id)}>新增项目</button>
                </header>
                <div>
                  {activeCategoryProjects.length > 0 ? activeCategoryProjects.map((project, index) => (
                    <article key={project.id}>
                      <img src={project.image} alt="" />
                      <div>
                        <span>{String(index + 1).padStart(2, '0')} · {project.year || '2026'}</span>
                        <strong>{project.title}</strong>
                        <small>{(project.gallery?.length || 0) + 1} 张图片</small>
                      </div>
                      <div className="admin-dashboard-item-actions">
                        <button type="button" onClick={() => onEditProject(project)}>编辑</button>
                        <button className="is-danger" type="button" onClick={() => onDeleteProject(project.id)}>删除</button>
                      </div>
                    </article>
                  )) : <p>该分类暂无项目</p>}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="settings-panel management-settings-panel">
              <section className="admin-dashboard-list" aria-labelledby="content-video-management-title">
                <header>
                  <div>
                    <span>MOTION ARCHIVE</span>
                    <h3 id="content-video-management-title">{draft.admin.tabs.video}</h3>
                  </div>
                  <button type="button" onClick={onAddVideo}>上传视频</button>
                </header>
                <div>
                  {videos.length > 0 ? videos.map((video, index) => (
                    <article key={video.id}>
                      {video.poster ? <img src={video.poster} alt="" /> : <span className="admin-dashboard-video-placeholder">VIDEO</span>}
                      <div>
                        <span>{String(index + 1).padStart(2, '0')} · {video.year || '2026'}</span>
                        <strong>{video.title}</strong>
                        <small>{video.duration ? formatDuration(video.duration) : '视频作品'}</small>
                      </div>
                      <div className="admin-dashboard-item-actions">
                        <button type="button" onClick={() => onEditVideo(video)}>编辑</button>
                        <button className="is-danger" type="button" onClick={() => onDeleteVideo(video.id)}>删除</button>
                      </div>
                    </article>
                  )) : <p>暂无视频作品</p>}
                </div>
              </section>
            </div>
          )}

          </div>

          {error && <span className="form-error content-form-error">{error}</span>}
          {saveNotice && <span className="form-success content-form-success">{saveNotice}</span>}
          <div className="editor-actions content-editor-actions">
            <button type="button" onClick={onClose}>返回作品集</button>
            {isManagementTab ? (
              <button type="button" onClick={onLogout}>退出管理</button>
            ) : (
              <button
                className="admin-primary-button"
                type="submit"
                disabled={processingAvatar || processingSiteIcon || processingAdminIcon || processingFolderCover || processingFont || saving}
              >
                {saving ? '正在保存…' : '保存全部修改'}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
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
  const [visitCount, setVisitCount] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    recordSiteVisit().then(setVisitCount).catch(() => {})
  }, [])

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

  useEffect(() => {
    document.title = content.site.title?.trim() || DEFAULT_CONTENT.site.title
    const icon = document.querySelector('link[rel="icon"]')
    if (icon) icon.href = content.site.icon || DEFAULT_CONTENT.site.icon
  }, [content.site.icon, content.site.title])

  useEffect(() => {
    const root = document.documentElement
    const theme = content.theme
    root.style.setProperty('--site-font-family', theme.fontFamily)
    root.style.setProperty('--theme-text', theme.textColor)
    root.style.setProperty('--theme-muted', theme.mutedColor)
    root.style.setProperty('--theme-accent', theme.accentColor)
    root.style.setProperty('--heading-gradient', `linear-gradient(115deg, ${theme.gradientStart}, ${theme.gradientEnd})`)
    document.body.classList.toggle('theme-heading-gradient', Boolean(theme.gradientEnabled))
  }, [content.theme])

  useEffect(() => {
    const fontStyle = document.createElement('style')
    fontStyle.dataset.portfolioFonts = 'true'
    fontStyle.textContent = (content.theme.customFonts || [])
      .filter((font) => font.family && font.src)
      .map((font) => `@font-face{font-family:'${font.family.replace(/'/g, '')}';src:url('${font.src}');font-display:swap;}`)
      .join('\n')
    document.head.appendChild(fontStyle)
    return () => fontStyle.remove()
  }, [content.theme.customFonts])

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
        visitCount={visitCount}
        onFeedback={() => setShowFeedback(true)}
        onManage={() => (isAdmin ? setShowContentEditor(true) : setShowLogin(true))}
      />
      <Hero content={content} />
      <main>
        <About content={content} projectCount={projects.length + videos.length} />
        <Strengths content={content} />
        <SoftwareStack content={content} />
        <Projects content={content} projects={projects} videos={videos} />
        <Contact content={content} />
      </main>

      {showFeedback && <FeedbackPanel isAdmin={isAdmin} onClose={() => setShowFeedback(false)} />}

      {showLogin && (
        <AdminLogin
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setIsAdmin(true)
            setShowLogin(false)
            setShowContentEditor(true)
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
          projects={projects}
          videos={videos}
          status={storageError || videoStorageError || contentStorageError || cloudError}
          cloudEmpty={cloudEnabled && cloudEmpty}
          migrationBusy={migrationBusy}
          migrationStatus={migrationStatus}
          onMigrate={migrateLocalData}
          onClose={() => setShowContentEditor(false)}
          onSave={saveContent}
          onAddProject={(categoryId = 'design') => openEditor({ category: categoryId })}
          onEditProject={openEditor}
          onDeleteProject={deleteProject}
          onAddVideo={() => openVideoEditor(undefined)}
          onEditVideo={openVideoEditor}
          onDeleteVideo={deleteVideo}
          onLogout={logout}
        />
      )}
    </>
  )
}
