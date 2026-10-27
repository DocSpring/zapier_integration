'use strict'

const fs = require('fs')
const path = require('path')
const App = require('../index')
const pkg = require('../package.json')
const { EVENT_TYPES } = require('../triggers/webhook_events')

const ROOT = path.join(__dirname, '..')

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return ['node_modules', 'test', '.git', 'build'].includes(entry.name)
        ? []
        : sourceFiles(full)
    }
    return entry.name.endsWith('.js') ? [full] : []
  })
}

// Pins the app-level settings and operation set (sc-5981 spec).
describe('app definition', () => {
  it('is version 2.0.0', () => {
    expect(pkg.version).toBe('2.0.0')
    expect(App.version).toBe('2.0.0')
  })

  it('never calls API v1', () => {
    const offenders = sourceFiles(ROOT).filter((file) =>
      fs.readFileSync(file, 'utf8').includes('/api/v1')
    )
    expect(offenders).toEqual([])
  })

  it('lets the error middleware see every response (no app-wide skipThrowForStatus)', () => {
    // With the app flag set, the platform marks every request
    // skipThrowForStatus, so API errors would come back as successful output.
    expect(App.flags.skipThrowForStatus).toBeUndefined()
    // D028: blank-input handling lives in our performs, not in the platform.
    expect(App.flags.cleanInputData).toBe(false)
  })

  it('has the operations in the spec, with the new keys', () => {
    expect(Object.keys(App.creates).sort()).toEqual(
      [
        'generate_pdf',
        'generate_pdf_batch',
        'check_data',
        'generate_submission_files',
        'expire_submission',
        'combine_pdfs',
        'create_signature_request',
        'create_signing_link',
        'create_template',
        'replace_template_pdf',
        'copy_template',
        'move_template',
        'publish_template_version',
        'add_template_fields',
        'update_template_fields',
        'remove_template_fields',
        'create_folder',
      ].sort()
    )
    expect(Object.keys(App.searches).sort()).toEqual(
      [
        'get_submission',
        'find_submissions',
        'get_submission_batch',
        'get_combined_pdf',
        'get_signature_request',
        'find_templates',
        'get_template',
        'list_template_fields',
        'get_template_page_images',
        'list_folders',
      ].sort()
    )
    expect(App.searchOrCreates.list_folders).toMatchObject({
      search: 'list_folders',
      create: 'create_folder',
    })
  })

  it('has a trigger for every v4 webhook event except webhook.*', () => {
    expect(EVENT_TYPES.sort()).toEqual(
      [
        'submission.created',
        'submission.processed',
        'submission.failed',
        'submission.declined',
        'submission.updated',
        'submission.expired',
        'signature_request.viewed',
        'signature_request.completed',
        'signature_request.declined',
        'signature_request.updated',
        'combined_pdf.processed',
        'combined_pdf.failed',
        'combined_pdf.expired',
        'submission_batch.processed',
        'submission_batch.failed',
        'template.created',
        'template.updated',
        'template.deleted',
        'custom_file.created',
        'folder.created',
        'folder.updated',
        'folder.deleted',
      ].sort()
    )
    EVENT_TYPES.forEach((eventType) => {
      expect(App.triggers[eventType.replace('.', '_')]).toBeDefined()
    })
    const hidden = Object.values(App.triggers).filter((t) => t.display.hidden)
    expect(hidden.map((t) => t.key).sort()).toEqual([
      'folder_choices',
      'template_choices',
    ])
  })

  it('never says "data request" or "UID" to users', () => {
    const userText = JSON.stringify(App, (key, value) =>
      typeof value === 'function' ? undefined : value
    )
    expect(userText).not.toMatch(/data request/i)
    expect(userText).not.toMatch(/\bUID\b/)
    expect(userText).not.toMatch(/combined submission/i)
  })

  it('links every required auth field to where its value is found (D002)', () => {
    const markdownLink = /\[[^\]]+\]\(https:\/\/[^)\s]+\)/
    const required = App.authentication.fields.filter((f) => f.required)
    expect(required.map((f) => f.key)).toEqual([
      'region',
      'token_id',
      'token_secret',
    ])
    for (const field of required) {
      expect(field.helpText).toMatch(markdownLink)
    }
  })
})
