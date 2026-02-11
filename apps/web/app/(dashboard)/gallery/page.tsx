'use client'

import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function GalleryPage() {
  useEffect(() => {
    // Redirect to history page which serves as gallery
    redirect('/history')
  }, [])

  return null
}
