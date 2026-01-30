import React from 'react';
import { Link as LinkIcon, Video as VideoIcon, Music as MusicIcon } from 'lucide-react';
import { InsertForm } from './InsertForm';

export const LinkTool = ({ editor, disabled }) => {
  return (
    <InsertForm
      title="链接"
      placeholder="输入链接地址..."
      Icon={LinkIcon}
      disabled={disabled}
      onConfirm={(url) => editor.insertText('[', `](${url})`)}
    />
  );
};

export const VideoTool = ({ editor, disabled }) => {
  return (
    <InsertForm
      title="视频"
      placeholder="支持 Bilibili/YouTube/MP4"
      Icon={VideoIcon}
      disabled={disabled}
      onConfirm={(url) => editor.insertBlock(`\n::video{src="${url}" width="100%"}\n`)}
    />
  );
};

export const AudioTool = ({ editor, disabled }) => {
  return (
    <InsertForm
      title="音频"
      placeholder="支持网易云音乐 / MP3 URL..."
      Icon={MusicIcon}
      disabled={disabled}
      onConfirm={(url) => editor.insertBlock(`\n::audio{src="${url}" width="100%"}\n`)}
    />
  );
};
