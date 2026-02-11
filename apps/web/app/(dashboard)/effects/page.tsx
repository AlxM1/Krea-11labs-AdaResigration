'use client'

import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function EffectsPage() {
  useEffect(() => {
    // Redirect to style-transfer page which handles AI effects
    redirect('/style-transfer')
  }, [])

  return null
}
