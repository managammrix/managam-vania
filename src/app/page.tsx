'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/lib/useLang'
import { Lang } from '@/lib/translations'
import {
  InviteeRow,
  fetchInviteeByRef,
  fetchDefaultMaxGuests,
} from '@/lib/supabase'
import EnvelopeScreen from '@/components/EnvelopeScreen'
import NavDots from '@/components/NavDots'
import LangToggle from '@/components/LangToggle'
import SaveBar from '@/components/SaveBar'
import CoverSection from '@/components/sections/CoverSection'
import StorySection from '@/components/sections/StorySection'
import CoupleSection from '@/components/sections/CoupleSection'
import EventsSection from '@/components/sections/EventsSection'
import RsvpSection from '@/components/sections/RsvpSection'
import GiftSection from '@/components/sections/GiftSection'
import WishesSection from '@/components/sections/WishesSection'
import GallerySection from '@/components/sections/GallerySection'
import ClosingSection from '@/components/sections/ClosingSection'
import AudioPlayer from '@/components/AudioPlayer'

const WEDDING_DATE = new Date('2026-06-20T10:00:00+07:00')

const ALL_SECTIONS = ['cover','story','couple','events','rsvp','gift','wishes','gallery','closing'] as const
const POST_SECTIONS = ['cover','story','couple','events','gift','wishes','gallery','closing'] as const

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [opened, setOpened] = useState(false)
  const [, setGuestRef] = useState<string | null>(null)
  const [guestData, setGuestData] = useState<InviteeRow | null>(null)
  const [defaultMaxGuests, setDefaultMaxGuests] = useState(2)
  const { lang, setLang, tr } = useLang()
  const isPostWedding = new Date() > WEDDING_DATE
  const sections = isPostWedding ? POST_SECTIONS : ALL_SECTIONS

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (!ref) {
      fetchDefaultMaxGuests().then(setDefaultMaxGuests)
      return
    }

    setGuestRef(ref)

    // Check sessionStorage cache first for speed (mobile)
    const cached = sessionStorage.getItem(`guest_${ref}`)
    if (cached) {
      try {
        const data = JSON.parse(cached)
        setGuestData(data)
        fetchDefaultMaxGuests().then(setDefaultMaxGuests)
        return
      } catch {}
    }

    fetchInviteeByRef(ref).then(data => {
      if (data) {
        setGuestData(data)
        sessionStorage.setItem(
          `guest_${ref}`,
          JSON.stringify(data)
        )
      }
    }).catch(err => {
      console.error('[ref] fetch error:', err)
    })

    fetchDefaultMaxGuests().then(setDefaultMaxGuests)
  }, [mounted])

  return (
    <div suppressHydrationWarning>
      <EnvelopeScreen
        opened={opened}
        onOpen={() => setOpened(true)}
        tr={tr}
        guestName={mounted ? (guestData?.name ?? null) : null}
      />
      {opened && (
        <>
          <AudioPlayer play={opened} />
          <LangToggle lang={lang} setLang={(l: Lang) => setLang(l)} />
          <NavDots sections={sections as unknown as string[]} />
          <SaveBar tr={tr} isPostWedding={isPostWedding} />
          <main>
            <CoverSection tr={tr} isPostWedding={isPostWedding} />
            <StorySection tr={tr} />
            <CoupleSection tr={tr} />
            <EventsSection tr={tr} />
            {!isPostWedding && (
              <RsvpSection
                tr={tr}
                guestData={mounted ? guestData : null}
                defaultMaxGuests={mounted ? defaultMaxGuests : 2}
              />
            )}
            <GiftSection tr={tr} />
            <WishesSection tr={tr} />
            <GallerySection tr={tr} />
            <ClosingSection tr={tr} />
          </main>
        </>
      )}
    </div>
  )
}
