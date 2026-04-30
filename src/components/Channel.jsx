import ChannelStatic from './ChannelStatic'
import './Channel.css'

export default function Channel({ children }) {
  const isEmpty = !children
  return (
    <div className="channel">
      <div className="channel-inner">
        {isEmpty && <ChannelStatic />}
        {children}
      </div>
    </div>
  )
}
