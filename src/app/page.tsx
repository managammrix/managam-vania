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

export const SECTIONS = [
  'cover','story','couple','events','rsvp','gift','wishes','gallery','closing'
] as const

export default function Home() {
  const [opened, setOpened] = useState(false)
  const { lang, setLang, tr } = useLang()

  return (
    <>
      <EnvelopeScreen opened={opened} onOpen={() => setOpened(true)} tr={tr} />
      {opened && (
        <>
          <LangToggle lang={lang} setLang={(l: Lang) => setLang(l)} />
          <NavDots sections={SECTIONS as unknown as string[]} />
          <SaveBar tr={tr} />
          <main>
            <CoverSection tr={tr} />
            <StorySection tr={tr} />
            <CoupleSection tr={tr} />
            <EventsSection tr={tr} />
            <RsvpSection tr={tr} />
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
