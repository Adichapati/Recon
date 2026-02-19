import { RetroLoader } from "@/components/retro"

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <RetroLoader label="SEARCHING" />
    </div>
  )
}
