'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
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

function HomeContent() {
  const [opened, setOpened] = useState(false)
  const [, setGuestRef] = useState<string | null>(null)
  const [guestData, setGuestData] = useState<InviteeRow | null>(null)
  const [defaultMaxGuests, setDefaultMaxGuests] = useState(2)
  // Initialize refLoading=true on first render if URL has ?ref= and not
  // cached, so we don't flash the un-personalized envelope before fetch.
  const [refLoading, setRefLoading] = useState<boolean>(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (!ref) return false
    return !sessionStorage.getItem(`guest_${ref}`)
  })
  const { lang, setLang, tr } = useLang()
  const isPostWedding = new Date() > WEDDING_DATE
  const sections = isPostWedding ? POST_SECTIONS : ALL_SECTIONS

  useEffect(() => {
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

    setRefLoading(true)
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
    }).finally(() => {
      setRefLoading(false)
      fetchDefaultMaxGuests().then(setDefaultMaxGuests)
    })
  }, [])

  return (
    <div>
      {refLoading ? (
        <div style={{
          minHeight:'100vh',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          background:'var(--forest)',
        }}>
          <div style={{textAlign:'center'}}>
            <div style={{
              fontFamily:'Cormorant Garamond,serif',
              fontSize:22,
              fontStyle:'italic',
              color:'var(--cream-warm)',
              marginBottom:16,
              opacity:0.8,
            }}>
              Managam &amp; Vania
            </div>
            <div style={{
              fontFamily:'Cinzel,serif',
              fontSize:9,
              letterSpacing:4,
              color:'var(--sage-light)',
              opacity:0.6,
            }}>
              20 · 06 · 2026
            </div>
          </div>
        </div>
      ) : (
        !opened && (
          <EnvelopeScreen
            opened={opened}
            onOpen={() => setOpened(true)}
            tr={tr}
            guestName={guestData?.name ?? null}
          />
        )
      )}
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
                guestData={guestData}
                defaultMaxGuests={defaultMaxGuests}
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

// SSR disabled — no server render = no hydration mismatch possible.
// Acceptable for a client-side-only wedding invitation.
export default dynamic(() => Promise.resolve(HomeContent), {
  ssr: false,
})
