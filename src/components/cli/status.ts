/* ---------------------------------------------------------------------------
   The single CLI status vocabulary.

   Stage 3 shipped two overlapping vocabularies: CliStatusDot used
   'ok' | 'active' | 'warn', while the About boot log used
   'ok' | 'armed' | 'warn' | 'err'. They are merged here into one exported
   type so a component never has to translate between them.

   Merged vocabulary, and what each state means:
     ok     something completed or is healthy      (green)
     active something is running right now         (cyan)
     armed  something is loaded and ready to fire  (cyan, boot log wording)
     warn   degraded but not failed                (amber)
     err    failed or missing                      (sakura)

   'active' and 'armed' render identically today. They are kept as distinct
   members because they read differently at the call site: a deploy is
   "active", a metronome is "armed". Collapsing them would force one of the
   two label vocabularies to lie.
--------------------------------------------------------------------------- */
export type CliStatus = 'ok' | 'active' | 'armed' | 'warn' | 'err'

export const STATUS_LABEL: Record<CliStatus, string> = {
  ok: '[OK]',
  active: '[ACTIVE]',
  armed: '[ARMED]',
  warn: '[WARN]',
  err: '[ERR]',
}

/* CLI palette only. Every value here is a token the contrast script checks;
   no opacity modifiers, no hardcoded hex. */
export const STATUS_CLASS: Record<CliStatus, string> = {
  ok: 'text-cli-green',
  active: 'text-cli-cyan',
  armed: 'text-cli-cyan',
  warn: 'text-cli-warn',
  err: 'text-cli-sakura',
}
