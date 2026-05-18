'use client'
import { Translations } from '@/lib/translations'

interface Props { opened: boolean; onOpen: () => void; tr: Translations }

export default function EnvelopeScreen({ opened, onOpen, tr }: Props) {
  if (opened) return null
  return (
    <div
      onClick={onOpen}
      style={{
        position:'fixed',inset:0,background:'var(--forest-deep)',zIndex:1000,
        display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
        cursor:'pointer',
      }}
    >
      <style>{`
        .env-wrapper{position:relative;width:300px;height:200px;perspective:600px;}
        .env-body{position:absolute;bottom:0;width:300px;height:168px;background:var(--cream);border-radius:4px 4px 14px 14px;box-shadow:0 24px 64px rgba(0,0,0,0.55);overflow:hidden;}
        .env-liner{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:center;}
        .env-flap{position:absolute;top:0;left:0;width:0;height:0;border-left:150px solid transparent;border-right:150px solid transparent;border-top:105px solid var(--cream-warm);transform-origin:top center;transform:rotateX(0deg);transition:transform 0.65s cubic-bezier(.4,0,.2,1);z-index:3;will-change:transform;}
        .env-wrapper:hover .env-flap{transform:rotateX(-175deg);}
        .card-peek{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);width:110px;height:110px;border-radius:50%;background:var(--parchment);display:flex;align-items:center;justify-content:center;z-index:1;transition:transform 0.65s cubic-bezier(.4,0,.2,1) 0.25s;box-shadow:0 4px 20px rgba(0,0,0,0.15);overflow:hidden;}
        .env-wrapper:hover .card-peek{transform:translateX(-50%) translateY(-52px);}
        .card-peek img{width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;}
        .open-hint{margin-top:36px;font-family:'Cormorant Garamond',serif;font-size:14px;color:var(--sage-light);letter-spacing:4px;animation:pulse-hint 2.2s ease-in-out infinite;}
        @keyframes pulse-hint{0%,100%{opacity:0.5}50%{opacity:1}}
      `}</style>
      <div className="env-wrapper">
        <div className="env-body">
          <div className="env-liner">
            <svg width="260" height="140" viewBox="0 0 260 140" fill="none" style={{opacity:0.2}}>
              <g stroke="#2d5a3d" strokeWidth="1">
                <path d="M130 140 C110 115,85 95,65 80 C80 70,100 75,115 90 C95 65,75 50,55 40 C70 35,90 45,105 60 C88 35,75 15,60 5 C78 3,98 18,108 38 C100 12,105 -5,120 -10 C128 10,122 32,115 52 C125 28,140 12,155 8 C158 28,145 48,132 65 C148 45,168 36,185 38 C170 50,150 66,135 85 C150 70,172 65,188 72 C172 84,150 98,133 115 C145 100,163 96,175 102 C160 116,142 122,130 140Z" fill="#2d5a3d" fillOpacity="0.09"/>
                <ellipse cx="80" cy="38" rx="14" ry="9" transform="rotate(-35,80,38)"/>
                <ellipse cx="180" cy="38" rx="14" ry="9" transform="rotate(35,180,38)"/>
              </g>
            </svg>
          </div>
        </div>
        <div className="env-flap"/>
        <div className="card-peek">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mv-logo.jpg" alt="M&V" />
        </div>
      </div>
      <div className="open-hint">{tr.click_open}</div>
    </div>
  )
}
