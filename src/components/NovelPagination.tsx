'use client'

interface NovelPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function getVisiblePages(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) pages.push('ellipsis')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < totalPages - 1) pages.push('ellipsis')
  pages.push(totalPages)

  return pages
}

export default function NovelPagination({ currentPage, totalPages, onPageChange }: NovelPaginationProps) {
  if (totalPages <= 1) return null

  const changePage = (page: number) => {
    onPageChange(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav aria-label="作品分頁" className="max-w-6xl mx-auto mt-10 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => changePage(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        上一頁
      </button>

      <div className="flex items-center gap-1" aria-label={`第 ${currentPage} 頁，共 ${totalPages} 頁`}>
        {getVisiblePages(currentPage, totalPages).map((page, index) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1 text-gray-400">…</span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => changePage(page)}
              aria-current={page === currentPage ? 'page' : undefined}
              className={`h-9 min-w-9 rounded-lg px-2 text-sm font-medium transition-colors ${
                page === currentPage
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {page}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        onClick={() => changePage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        下一頁
      </button>
    </nav>
  )
}
