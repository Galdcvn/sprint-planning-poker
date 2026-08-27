import type { PokerUser } from '../lib/types'

export function Avatar({
  user,
  isMe,
  highlight,
}: {
  user: PokerUser
  isMe: boolean
  highlight: boolean
}) {
  return (
    <div className={`avatar${isMe ? ' me' : ''}${highlight ? ' voted' : ''}`}>
      <div className="avatar-icon">{user.icon}</div>
      <span className="avatar-name">
        {user.name}
        {isMe ? ' (você)' : ''}
      </span>
    </div>
  )
}
