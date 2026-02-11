'use client'

import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function VideoFromImagePage() {
  useEffect(() => {
    // Redirect to video page - it has Image to Video tab
    redirect('/video?tab=image')
  }, [])

  return null
}
