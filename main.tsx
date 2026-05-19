import { octopusRum } from '@octopus-sdk/browser-rum';
import type { RumEvent } from '@octopus-sdk/browser-rum/lib/esm/rumEvent.type';

// Rush 预览 iframe 的唯一标识
const RUSH_PREVIEW_IFRAME_ID = 'rush-preview-iframe';

// Debug RUM 函数：将 RUM 事件上报到 Agent API
const __debugRum = function(event: RumEvent) {
  // 只在 Rush 预览 iframe 中执行
  // 通过 window.name 判断（iframe 的 name 属性会设置到 window.name）
  if (window.name !== RUSH_PREVIEW_IFRAME_ID || event.type !== 'error') {
    return;
  }

  try {
    fetch('https://gfi3mpa9ejri-preview.rush.zhenguanyu.com//agent/api/rum/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'gfi3mpa9ejri',
        event: event
      })
    }).catch(function(err) {
      console.warn('[RUM Debug] Failed to report error:', err);
    });
  } catch (err) {
    console.warn('[RUM Debug] Failed to report error:', err);
  }
};

octopusRum.init({
  site: 'octopus-ingest-cn.zhenguanyu.com',
  service: 'gfi3mpa9ejri',
  env: 'online',
  version: '1778293994697',
  applicationId: 'a331d3bf-21e1-4e68-b9c3-0fefe1edec93',
  clientToken: '06d65f105a974be58c8eea317ca01f24',
  trackUserInteractions: true,
  trackResources: true,
  trackViewsManually: false,
  beforeSend: function(event) {
    // 过滤掉指向收集服务的事件，避免循环上报
    if (event.type === 'resource' &&
      (event as { resource?: { url?: string } }).resource?.url?.includes('https://gfi3mpa9ejri-preview.rush.zhenguanyu.com//agent/api/rum/events')) {
      return false; // 不发送这个事件
    }

    // 调用 debug 函数上报到 Agent
    __debugRum(event);

    // 返回 true 继续正常上报到 Octopus
    return true;
  }
});import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import './hmr-bridge'; // 导入 HMR Bridge

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
