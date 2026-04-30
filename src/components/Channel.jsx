import './Channel.css'

export default function Channel({ children }) {
  return (
    <div className="channel">
      <div className="channel-inner">
        {children}
      </div>
    </div>
  )
}
