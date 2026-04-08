export function generateSecurePassword(len = 16) {
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const nums  = '23456789'
  const syms  = '!@#$%*_-+='
  const all   = lower + upper + nums + syms
  const rand  = (s) => s[Math.floor(Math.random() * s.length)]
  let out = [rand(lower), rand(upper), rand(nums), rand(syms)]
  for (let i = out.length; i < len; i++) out.push(rand(all))
  return out.sort(() => Math.random() - 0.5).join('')
}
