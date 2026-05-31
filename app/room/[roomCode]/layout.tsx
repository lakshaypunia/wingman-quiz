import RoomClientLayout from './RoomClientLayout'

// Next.js 16: params is a Promise — must be awaited
export default async function RoomLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ roomCode: string }>
}) {
  const { roomCode } = await params
  return <RoomClientLayout roomCode={roomCode}>{children}</RoomClientLayout>
}
