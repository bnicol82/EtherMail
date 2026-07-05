import * as openpgp from 'openpgp'

export interface GeneratedKeypair {
  publicKeyArmored: string
  privateKeyArmored: string
  fingerprint: string
}

let sessionPrivateKey: openpgp.PrivateKey | null = null

export function isE2eeUnlocked(): boolean {
  return sessionPrivateKey !== null
}

export function lockE2eeSession(): void {
  sessionPrivateKey = null
}

export async function generateKeypair(
  email: string,
  passphrase: string,
  name?: string,
): Promise<GeneratedKeypair> {
  const { privateKey, publicKey } = await openpgp.generateKey({
    type: 'rsa',
    rsaBits: 4096,
    userIDs: [{ name: name ?? email.split('@')[0], email }],
    passphrase,
    format: 'armored',
  })

  const pub = await openpgp.readKey({ armoredKey: publicKey })
  return {
    publicKeyArmored: publicKey,
    privateKeyArmored: privateKey,
    fingerprint: pub.getFingerprint(),
  }
}

export async function unlockPrivateKey(
  privateKeyArmored: string,
  passphrase: string,
): Promise<void> {
  const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored })
  sessionPrivateKey = await openpgp.decryptKey({ privateKey, passphrase })
}

export async function encryptForRecipients(
  plaintext: string,
  recipientPublicKeysArmored: string[],
  sign = true,
): Promise<string> {
  const encryptionKeys = await Promise.all(
    recipientPublicKeysArmored.map((armored) => openpgp.readKey({ armoredKey: armored })),
  )

  const message = await openpgp.createMessage({ text: plaintext })

  if (sign && sessionPrivateKey) {
    return openpgp.encrypt({
      message,
      encryptionKeys,
      signingKeys: sessionPrivateKey,
      format: 'armored',
    })
  }

  return openpgp.encrypt({
    message,
    encryptionKeys,
    format: 'armored',
  })
}

export async function decryptArmoredMessage(armoredMessage: string): Promise<string> {
  if (!sessionPrivateKey) {
    throw new Error('Unlock your encryption keys with your passphrase first.')
  }

  const message = await openpgp.readMessage({ armoredMessage })
  const { data } = await openpgp.decrypt({
    message,
    decryptionKeys: sessionPrivateKey,
    format: 'utf8',
  })

  return String(data)
}

export function isArmoredPgpMessage(text: string): boolean {
  return text.includes('-----BEGIN PGP MESSAGE-----')
}

export async function readPublicKeyFingerprint(armored: string): Promise<string> {
  const key = await openpgp.readKey({ armoredKey: armored })
  return key.getFingerprint()
}
