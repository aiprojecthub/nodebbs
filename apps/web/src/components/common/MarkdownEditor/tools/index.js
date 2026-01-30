import { FormatTool, HeadingTool } from './format';
import { LinkTool, VideoTool, AudioTool } from './media';
import { TableTool } from './table';
import { ImageTool } from './image';

// 工具注册表
export const ToolRegistry = {
  // 基础格式化
  bold: (props) => <FormatTool type="bold" {...props} />,
  italic: (props) => <FormatTool type="italic" {...props} />,
  strike: (props) => <FormatTool type="strike" {...props} />,
  code: (props) => <FormatTool type="code" {...props} />,
  codeBlock: (props) => <FormatTool type="codeBlock" {...props} />,
  quote: (props) => <FormatTool type="quote" {...props} />,
  bulletList: (props) => <FormatTool type="bulletList" {...props} />,
  orderedList: (props) => <FormatTool type="orderedList" {...props} />,
  checklist: (props) => <FormatTool type="checklist" {...props} />,
  horizontalRule: (props) => <FormatTool type="horizontalRule" {...props} />,
  
  // 复杂交互
  heading: HeadingTool,
  table: TableTool,
  link: LinkTool,
  video: VideoTool,
  audio: AudioTool,
  image: ImageTool,
};
