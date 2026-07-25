import ChannelStatic from './ChannelStatic'
import './Channel.css'

export default function Channel({ children, index = 0 }) {
  const isEmpty = !children
  return (
    <div className="channel">
      <div className="channel-inner">
        {isEmpty && <ChannelStatic index={index} />}
        {children}
      </div>
    </div>
  )
}
