import ChannelStatic from './ChannelStatic'
import './Channel.css'

export default function Channel({ children, index = 0 }) {
  const isEmpty = !children
  return (
    <div className="channel">
      <div className={`channel-inner${isEmpty ? ' channel-inner--empty' : ''}`}>
        {/* DELIBERATE DIVERGENCE (2026-07-29): the console stamps a ghosted
            "Wii" watermark into every empty slot (4.5% opacity). Omitted as a
            trademark, by request. */}
        {isEmpty && <ChannelStatic index={index} />}
        {children}
      </div>
    </div>
  )
}
