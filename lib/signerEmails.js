'use strict'

const { compact, splitNames, text, toBoolean, toInteger } = require('./util')

// Who sends the signers their links: DocSpring emails them (the API's
// default, `send_email: true`), or you send the links yourself
// (`send_email: false`). Create Signature Request and Check Data both offer
// it, so a check covers what the create will send.

const EMAIL_MODES = [
  {
    value: 'docspring',
    sample: 'docspring',
    label: 'DocSpring emails each signer their link',
  },
  {
    value: 'self',
    sample: 'self',
    label: 'I send the links, or open them in my app',
  },
]

const sendEmailInput = {
  key: 'send_email',
  label: 'Emails to Signers',
  type: 'string',
  required: false,
  default: 'docspring',
  choices: EMAIL_MODES,
  altersDynamicFields: true,
  helpText:
    'DocSpring emails each signer a link to sign, any reminders, and the signed PDF once everyone has signed. ' +
    'A test submission can only email members of your DocSpring team: other addresses are refused. ' +
    "DocSpring doesn't email the signers of a form library template: choose I send the links for one.",
}

const signingOrderInput = {
  key: 'signing_order',
  label: 'Signing Order',
  type: 'string',
  required: false,
  default: 'parallel',
  choices: [
    { value: 'parallel', sample: 'parallel', label: 'Everyone at once' },
    { value: 'sequential', sample: 'sequential', label: 'One step at a time' },
  ],
  helpText:
    'One step at a time: people sign in the order of their Signing Step, or of the signers. ' +
    'DocSpring emails each step when the one before it is done. ' +
    "When you send the links, send each step's once the step before it has signed, and make a new one with " +
    'Create Signing Link if it has expired (email links last 7 days, API links 24 hours).',
}

// The email options, shown when DocSpring emails the signers. The API refuses
// them when it emails nobody.
const emailOptionFields = [
  {
    key: 'email_subject',
    label: 'Email Subject',
    type: 'string',
    required: false,
    helpText:
      'The subject of the emails that ask people to sign. Leave it empty for "<your name> sent you <document> to sign".',
  },
  {
    key: 'email_message',
    label: 'Message',
    type: 'text',
    required: false,
    helpText:
      'A message for the signers, shown above the signing button. Links and web addresses are shown as plain text.',
  },
  {
    key: 'cc',
    label: 'CC',
    type: 'string',
    list: true,
    required: false,
    helpText: "Up to 10 people who get the signed PDF. They don't sign.",
  },
  {
    key: 'reminder_interval_days',
    label: 'Days Between Reminders',
    type: 'integer',
    required: false,
    helpText:
      "Remind people who haven't signed, every 1 to 30 days. Leave both reminder fields empty for no reminders.",
  },
  {
    key: 'reminder_max_count',
    label: 'Most Reminders per Person',
    type: 'integer',
    required: false,
    helpText: 'From 1 to 10.',
  },
  {
    key: 'reply_to',
    label: 'Reply-To Address',
    type: 'string',
    required: false,
    helpText:
      'Where replies to the emails go: a member of your DocSpring team, or an address at one of your verified ' +
      "email domains. Leave it empty for the template's reply-to address (the account owner when it has none).",
  },
  {
    key: 'notification_emails',
    label: 'Notification Emails',
    type: 'string',
    list: true,
    required: false,
    helpText:
      'Up to 10 addresses that DocSpring tells when the document is completed or declined, or an email bounces ' +
      "or can't be sent: members of your DocSpring team or addresses at your verified email domains. " +
      "Leave it empty for the template's notification addresses (the account owner when it has none).",
  },
  {
    key: 'notify_when_signed',
    label: 'Notify When Each Person Signs?',
    type: 'boolean',
    required: false,
    helpText: 'Also email the notification addresses each time someone signs.',
  },
]

// 'docspring' or 'self'. Blank is DocSpring's emails, as in the API.
function emailMode(z, input) {
  const mode = text(input.send_email) || 'docspring'
  if (!EMAIL_MODES.some((m) => m.value === mode)) {
    throw new z.errors.Error(
      `Emails to Signers must be docspring or self, not "${mode}".`,
      'InvalidInput',
      400
    )
  }
  return mode
}

// The submission's email settings for the request body: `send_email`, the
// signing order, and (only when DocSpring emails the signers) the email
// options that have a value.
function emailSettings(z, input) {
  const mode = emailMode(z, input)
  const settings = {
    send_email: mode === 'docspring',
    signing_order: text(input.signing_order),
  }
  if (mode === 'self') return compact(settings)

  const intervalDays = toInteger(
    z,
    input.reminder_interval_days,
    'Days Between Reminders'
  )
  const maxCount = toInteger(
    z,
    input.reminder_max_count,
    'Most Reminders per Person'
  )
  const cc = splitNames(input.cc)
  const notificationEmails = splitNames(input.notification_emails)
  return compact({
    ...settings,
    email_subject: text(input.email_subject),
    email_message: text(input.email_message),
    cc: cc.length ? cc : undefined,
    // The API needs both; one alone gets its 422, which names the other.
    reminders:
      intervalDays === undefined && maxCount === undefined
        ? undefined
        : compact({ interval_days: intervalDays, max_count: maxCount }),
    reply_to: text(input.reply_to),
    notification_emails: notificationEmails.length
      ? notificationEmails
      : undefined,
    notify_when_signed: toBoolean(
      z,
      input.notify_when_signed,
      'Notify When Each Person Signs?'
    ),
  })
}

module.exports = {
  EMAIL_MODES,
  emailMode,
  emailOptionFields,
  emailSettings,
  sendEmailInput,
  signingOrderInput,
}
