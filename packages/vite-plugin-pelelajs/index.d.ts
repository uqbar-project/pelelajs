export interface PelelaVitePlugin {
  name: string
  enforce?: 'pre' | 'post'
  load?(this: any, id: string): string | null | Promise<string | null>
}

export declare function pelelajsPlugin(): PelelaVitePlugin
