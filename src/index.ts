import type { Plugin } from 'vite'
import { readFile, writeFile, watchFile } from 'node:fs'
import { join } from 'node:path'

export default function uniPagesTypes(): Plugin {
  return {
    name: 'vite-plugin-uni-pages-types',
    enforce: 'post',
    apply: 'serve',
    configureServer() {
      const cwd = process.cwd()
      const jsonFilePath = join(cwd, 'src/pages.json')
      const dtsFilePath = join(cwd, 'src/pages.d.ts')

      // 定义一个函数来读取 JSON 并写入 DTS 文件
      const updatePagesDts = () => {
        readFile(jsonFilePath, 'utf-8', (err, data) => {
          if (err) {
            console.error('\x1b[31m%s\x1b[0m', '[vite-plugin-pages-json-types]: 读取 pages.json 文件失败')
            console.error('\x1b[31m%s\x1b[0m', err)
            return
          }

          try {
            let json
            try {
              json = JSON.parse(data)
            } catch {
              // 使用正则表达式去除所有注释（单行和多行）
              json = JSON.parse(data.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''))
            }

            const pages = json.pages.map((page: any) => page.path)
            const subPackagesPages = json.subPackages?.reduce((acc: any, cur: any) => {
              cur.pages.forEach((page: any) => { acc.push(join(cur.root, page.path)) })
              return acc
            }, []) || []
            const tabBarPages = json.tabBar?.list.map((item: any) => item.pagePath) || []
            const dtsContent =
              'export type Pages = ' +
              JSON.stringify(pages.concat(subPackagesPages), null, 2) +
              '\n' +
              'export type TabBarPages = ' +
              JSON.stringify(tabBarPages, null, 2) +
              '\n' +
              'export type PagesConfig = ' +
              JSON.stringify(json, null, 2)

            writeFile(dtsFilePath, dtsContent, 'utf-8', (err) => {
              if (err) {
                console.error('\x1b[31m%s\x1b[0m', '[vite-plugin-pages-json-types]: 写入 pages.d.ts 文件失败')
                console.error('\x1b[31m%s\x1b[0m', err)
              }
            })
          } catch (error) {
            console.error('\x1b[31m%s\x1b[0m', '[vite-plugin-pages-json-types]: pages.json 文件格式错误')
            console.error('\x1b[31m%s\x1b[0m', error)
          }
        })
      }

      watchFile(jsonFilePath, (cur, pre) => cur.mtime !== pre.mtime && updatePagesDts())

      // 开发服务器启动时执行一次写入
      updatePagesDts()
    }
  }
}
