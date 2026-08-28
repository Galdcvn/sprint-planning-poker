import type { CSSProperties } from 'react'
import type { Player } from '../lib/types'

export function Avatar({
  player,
  isMe,
  highlight,
  style,
}: {
  player: Player
  isMe: boolean
  highlight: boolean
  style?: CSSProperties
}) {
  return (
    <div
      className={`avatar${isMe ? ' me' : ''}${highlight ? ' voted' : ''}`}
      style={style}
    >
      <div className="avatar-icon">
        <img src={player.icon} alt="" className="avatar-img" />
      </div>
      <span className="avatar-name">
        {player.name}
        {isMe ? ' (você)' : ''}
      </span>
    </div>
  )
}
