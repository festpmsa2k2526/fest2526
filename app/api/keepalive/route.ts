import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { error } = await supabase
    .from('keep_alive_status')
    .update({ last_ping: new Date().toISOString() })
    .eq('id', 1)

  if (error) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    status: 'alive',
    updated_at: new Date().toISOString()
  })
}
