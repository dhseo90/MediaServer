// 검증 전용: 외부 ICE 서버가 섞이면 미디어 명령 실행 전에 거부한다.
function validatePort(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('검증 소유 UDP port 필요');
}
export function assertLocalIceEnvironment(env, port) {
  validatePort(port);
  if (env.MEDIA_SERVER_WEBRTC_STUN_SERVER !== `stun://127.0.0.1:${port}` ||
      Object.entries(env).some(([key, value]) => key.includes('TURN_SERVER') && value)) {
    throw Error('검증 환경에 명시 소유 loopback STUN만 허용');
  }
}
export function assertLocalIceConfig(config, port) {
  validatePort(port);
  const servers = config?.peerConnectionConfig?.iceServers;
  if (config?.hasStun !== true || config?.hasTurn !== false || !Array.isArray(servers) ||
      servers.length !== 1 || servers[0]?.urls !== `stun:127.0.0.1:${port}` ||
      Object.keys(servers[0]).some(key => key !== 'urls')) {
    throw Error('실제 서버 ICE 설정이 소유 loopback 경계와 불일치');
  }
}
