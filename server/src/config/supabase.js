const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')

// Node 20 (our CI runner and, per package.json's engines field, our minimum
// supported/deployed version) has no native global WebSocket — only Node 22+
// does. @supabase/supabase-js constructs a RealtimeClient eagerly inside
// createClient(), even though this app never uses realtime subscriptions, so
// without an explicit transport that constructor throws synchronously on
// Node 20 (and crashes any module that requires this file, e.g. every
// service/test that imports supabaseAdmin). Passing the `ws` package as the
// transport satisfies that constructor; we never actually open a socket.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  }
)

module.exports = supabaseAdmin
