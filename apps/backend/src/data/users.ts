import fs from 'fs/promises'
import path from 'path'

export type User = {
    id: number
    username: string
    passwordHash: string
    roles: string[]
    permissions: string[]
}

const USERS_FILE = path.resolve('src/data/users.json')

export async function readUsers(): Promise<User[]> {
    const txt = await fs.readFile(USERS_FILE, 'utf-8')
    return JSON.parse(txt)
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
    const users = await readUsers()
    return users.find(u => u.username === username)
}

export async function findUserById(id: number): Promise<User | undefined> {
    const users = await readUsers()
    return users.find(u => u.id === id)
}
