import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Article } from '@/types/article'
import type { Category } from '@/types/category'
import type { Tag } from '@/types/tag'
import { getArticles, createArticle, updateArticle, deleteArticle, getArticle } from '@/api/article'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/api/category'
import { getTags, createTag, updateTag, deleteTag } from '@/api/tag'
import { ElMessage } from 'element-plus'
const articleRequestId = ref(0)

export const useArticleStore = defineStore('article', () => {
  // ==================== 文章相关状态 ====================
  const articles = ref<Article[]>([])
  const currentArticle = ref<Article | null>(null)
  const articleLoading = ref(false)
  const articleError = ref<string | null>(null)
  const articleTotal = ref(0)
  const articlePage = ref(1)
  const articlePageSize = ref(20)
  const articleLastUpdated = ref<number>(0)

  // ==================== 分类相关状态 ====================
  const categories = ref<Category[]>([])
  const categoryLoading = ref(false)
  const categoryError = ref<string | null>(null)
  const categoryLastUpdated = ref<number>(0)

  // ==================== 标签相关状态 ====================
  const tags = ref<Tag[]>([])
  const tagLoading = ref(false)
  const tagError = ref<string | null>(null)
  const tagLastUpdated = ref<number>(0)

  // ==================== Getters ====================
  // 文章相关
  const articleList = computed(() => articles.value)
  const isArticleLoading = computed(() => articleLoading.value)
  const articleListTotal = computed(() => articleTotal.value)

  // 分类相关
  const categoryOptions = computed(() => {
    return categories.value.map(category => ({
      label: category.name,
      value: category.id
    }))
  })
  const categoryList = computed(() => categories.value)
  const isCategoryLoading = computed(() => categoryLoading.value)

  // 标签相关
  const tagOptions = computed(() => {
    return tags.value.map(tag => ({
      label: tag.name,
      value: tag.id
    }))
  })
  const tagList = computed(() => tags.value)
  const isTagLoading = computed(() => tagLoading.value)

  // ==================== 文章相关方法 ====================
  // 获取文章列表
  const fetchArticles = async (query: any = {}) => {
    const requestId = ++articleRequestId.value
    articleLoading.value = true
    articleError.value = null
    try {
      const params = {
        page: query.page || articlePage.value,
        page_size: query.page_size || articlePageSize.value,
        category_id: query.category_id,
        tag_id: query.tag_id,
        keyword: query.keyword,
        is_publish: query.is_publish
      }
      const result = await getArticles(params)
      // 如果这不是最后一次请求，直接忽略返回结果
      if (requestId !== articleRequestId.value) return result
      articles.value = result.list || []
      articleTotal.value = result.total
      articlePage.value = params.page
      articlePageSize.value = params.page_size
      articleLastUpdated.value = Date.now()
      return result
    } catch (err) {
      // 如果这是最后一次请求，才更新错误信息
     if (requestId === articleRequestId.value) {
      articleError.value = err instanceof Error ? err.message : '获取文章列表失败'
      ElMessage.error(articleError.value)
    }
      throw err
    } finally {
      if (requestId === articleRequestId.value) {
      articleLoading.value = false
    }
    }
  }

  // 获取文章详情
  const fetchArticleById = async (id: number) => {
    articleLoading.value = true
    articleError.value = null
    try {
      const article = await getArticle(id)
      currentArticle.value = article
      return article
    } catch (err) {
      articleError.value = err instanceof Error ? err.message : '获取文章详情失败'
      ElMessage.error(articleError.value)
      throw err
    } finally {
      articleLoading.value = false
    }
  }

  // 创建文章
  const addArticle = async (article: Omit<Article, 'id'>) => {
    articleLoading.value = true
    articleError.value = null
    try {
      const newArticle = await createArticle(article)
      articles.value.unshift(newArticle)
      articleTotal.value++
      articleLastUpdated.value = Date.now()
      return newArticle
    } catch (err) {
      articleError.value = err instanceof Error ? err.message : '创建文章失败'
      ElMessage.error(articleError.value)
      throw err
    } finally {
      articleLoading.value = false
    }
  }

  // 更新文章
  const updateArticleById = async (id: number, article: Partial<Article>) => {
    articleLoading.value = true
    articleError.value = null
    try {
      const updatedArticle = await updateArticle(id, article)
      const index = articles.value.findIndex(a => a.id === id)
      if (index !== -1) {
        articles.value[index] = updatedArticle
      }
      if (currentArticle.value?.id === id) {
        currentArticle.value = updatedArticle
      }
      articleLastUpdated.value = Date.now()
      return updatedArticle
    } catch (err) {
      articleError.value = err instanceof Error ? err.message : '更新文章失败'
      ElMessage.error(articleError.value)
      throw err
    } finally {
      articleLoading.value = false
    }
  }

  // 删除文章
  const deleteArticleById = async (id: number) => {
    articleLoading.value = true
    articleError.value = null
    try {
      await deleteArticle(id)
      articles.value = articles.value.filter(a => a.id !== id)
      articleTotal.value--
      if (currentArticle.value?.id === id) {
        currentArticle.value = null
      }
      articleLastUpdated.value = Date.now()
      ElMessage.success('删除文章成功')
    } catch (err) {
      articleError.value = err instanceof Error ? err.message : '删除文章失败'
      ElMessage.error(articleError.value)
      throw err
    } finally {
      articleLoading.value = false
    }
  }

  // ==================== 分类相关方法 ====================
  // 获取分类列表
  const fetchCategories = async () => {
    categoryLoading.value = true
    categoryError.value = null
    try {
      const result = await getCategories()
      categories.value = result.list
      categoryLastUpdated.value = Date.now()
      return result
    } catch (err) {
      categoryError.value = err instanceof Error ? err.message : '获取分类列表失败'
      ElMessage.error(categoryError.value)
      throw err
    } finally {
      categoryLoading.value = false
    }
  }

  // 创建分类
  const addCategory = async (category: Omit<Category, 'id'>) => {
    categoryLoading.value = true
    categoryError.value = null
    try {
      const newCategory = await createCategory(category)
      categories.value.push(newCategory)
      categoryLastUpdated.value = Date.now()
      ElMessage.success('创建分类成功')
      return newCategory
    } catch (err) {
      categoryError.value = err instanceof Error ? err.message : '创建分类失败'
      ElMessage.error(categoryError.value)
      throw err
    } finally {
      categoryLoading.value = false
    }
  }

  // 更新分类
  const updateCategoryById = async (id: number, category: Partial<Category>) => {
    categoryLoading.value = true
    categoryError.value = null
    try {
      const updatedCategory = await updateCategory(id, category)
      const index = categories.value.findIndex(c => c.id === id)
      if (index !== -1) {
        categories.value[index] = updatedCategory
      }
      categoryLastUpdated.value = Date.now()
      ElMessage.success('更新分类成功')
      return updatedCategory
    } catch (err) {
      categoryError.value = err instanceof Error ? err.message : '更新分类失败'
      ElMessage.error(categoryError.value)
      throw err
    } finally {
      categoryLoading.value = false
    }
  }

  // 删除分类
  const deleteCategoryById = async (id: number) => {
    categoryLoading.value = true
    categoryError.value = null
    try {
      await deleteCategory(id)
      categories.value = categories.value.filter(c => c.id !== id)
      categoryLastUpdated.value = Date.now()
      ElMessage.success('删除分类成功')
    } catch (err) {
      categoryError.value = err instanceof Error ? err.message : '删除分类失败'
      ElMessage.error(categoryError.value)
      throw err
    } finally {
      categoryLoading.value = false
    }
  }

  // 根据ID获取分类
  const getCategoryById = (id: number) => {
    return categories.value.find(c => c.id === id)
  }

  // ==================== 标签相关方法 ====================
  // 获取标签列表
  const fetchTags = async () => {
    tagLoading.value = true
    tagError.value = null
    try {
      const result = await getTags()
      tags.value = result.list
      tagLastUpdated.value = Date.now()
      return result
    } catch (err) {
      tagError.value = err instanceof Error ? err.message : '获取标签列表失败'
      ElMessage.error(tagError.value)
      throw err
    } finally {
      tagLoading.value = false
    }
  }

  // 创建标签
  const addTag = async (tag: Omit<Tag, 'id'>) => {
    tagLoading.value = true
    tagError.value = null
    try {
      const newTag = await createTag(tag)
      tags.value.push(newTag)
      tagLastUpdated.value = Date.now()
      ElMessage.success('创建标签成功')
      return newTag
    } catch (err) {
      tagError.value = err instanceof Error ? err.message : '创建标签失败'
      ElMessage.error(tagError.value)
      throw err
    } finally {
      tagLoading.value = false
    }
  }

  // 更新标签
  const updateTagById = async (id: number, tag: Partial<Tag>) => {
    tagLoading.value = true
    tagError.value = null
    try {
      const updatedTag = await updateTag(id, tag)
      const index = tags.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tags.value[index] = updatedTag
      }
      tagLastUpdated.value = Date.now()
      ElMessage.success('更新标签成功')
      return updatedTag
    } catch (err) {
      tagError.value = err instanceof Error ? err.message : '更新标签失败'
      ElMessage.error(tagError.value)
      throw err
    } finally {
      tagLoading.value = false
    }
  }

  // 删除标签
  const deleteTagById = async (id: number) => {
    tagLoading.value = true
    tagError.value = null
    try {
      await deleteTag(id)
      tags.value = tags.value.filter(t => t.id !== id)
      tagLastUpdated.value = Date.now()
      ElMessage.success('删除标签成功')
    } catch (err) {
      tagError.value = err instanceof Error ? err.message : '删除标签失败'
      ElMessage.error(tagError.value)
      throw err
    } finally {
      tagLoading.value = false
    }
  }

  // 根据ID获取标签
  const getTagById = (id: number) => {
    return tags.value.find(t => t.id === id)
  }

  // ==================== 初始化方法 ====================
  // 初始化所有数据
  const initialize = async () => {
    try {
      await Promise.all([
        fetchCategories(),
        fetchTags()
      ])
    } catch (err) {
      console.error('初始化数据失败:', err)
    }
  }

  return {
    // 文章相关
    articles,
    currentArticle,
    articleLoading,
    articleError,
    articleTotal,
    articlePage,
    articlePageSize,
    articleLastUpdated,
    articleList,
    isArticleLoading,
    articleListTotal,
    fetchArticles,
    fetchArticleById,
    addArticle,
    updateArticleById,
    deleteArticleById,

    // 分类相关
    categories,
    categoryLoading,
    categoryError,
    categoryLastUpdated,
    categoryOptions,
    categoryList,
    isCategoryLoading,
    fetchCategories,
    addCategory,
    updateCategoryById,
    deleteCategoryById,
    getCategoryById,

    // 标签相关
    tags,
    tagLoading,
    tagError,
    tagLastUpdated,
    tagOptions,
    tagList,
    isTagLoading,
    fetchTags,
    addTag,
    updateTagById,
    deleteTagById,
    getTagById,

    // 初始化
    initialize
  }
})
