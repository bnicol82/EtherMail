export const EMAIL_FOLDERS = [
  { id: 'inbox' as const, label: 'Inbox' },
  { id: 'sent' as const, label: 'Sent' },
  { id: 'drafts' as const, label: 'Drafts' },
  { id: 'archive' as const, label: 'Archive' },
  { id: 'trash' as const, label: 'Trash' },
]

export function emailFolderLabel(folder: string): string {
  return EMAIL_FOLDERS.find((f) => f.id === folder)?.label ?? folder
}
