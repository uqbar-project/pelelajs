export interface PelelaVitePlugin {
  name: string
  enforce?: 'pre' | 'post'
  load?(this: unknown, id: string): string | null | Promise<string | null>
}

export declare function pelelajsPlugin(): PelelaVitePlugin
