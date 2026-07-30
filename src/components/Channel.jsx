import ChannelStatic from './ChannelStatic'
import WiiWordmark from './WiiWordmark'
import './Channel.css'

export default function Channel({ children, index = 0 }) {
  const isEmpty = !children
  return (
    <div className="channel">
      <div className={`channel-inner${isEmpty ? ' channel-inner--empty' : ''}`}>
        {isEmpty && (
          <>
            <ChannelStatic index={index} />
            <WiiWordmark />
          </>
        )}
        {children}
      </div>
    </div>
  )
}
