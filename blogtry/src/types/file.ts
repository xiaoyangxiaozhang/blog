export interface FileListQuery{
 page?: number
 page_size?: number
 type?: string
}
export interface FileInfo{
file_name	:string
file_size	:number
file_type	:string
file_url:	string
id:	number
original_name:	string
status:	number
upload_time:string
upload_type:	string
}
export interface FileListData {
  list: FileInfo[]
  total: number
  page: number
  page_size: number
}