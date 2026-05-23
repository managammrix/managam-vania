'use client'
import { useState } from 'react'
import { useLang } from '@/lib/useLang'
import { Lang } from '@/lib/translations'
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
  const [opened, setOpened] = useState(false)
  const { lang, setLang, tr } = useLang()
  const isPostWedding = new Date() > WEDDING_DATE
  const sections = isPostWedding ? POST_SECTIONS : ALL_SECTIONS

  return (
    <>
      <EnvelopeScreen opened={opened} onOpen={() => setOpened(true)} tr={tr} />
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
            {!isPostWedding && <RsvpSection tr={tr} />}
            <GiftSection tr={tr} />
            <WishesSection tr={tr} />
            <GallerySection tr={tr} />
            <ClosingSection tr={tr} />
          </main>
        </>
      )}
    </>
  )
}
