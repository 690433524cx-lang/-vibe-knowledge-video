// 着色器公共片段：规定的哈希、以全片时长为周期的角频率、解析卷曲噪声
export const COMMON = /* glsl */`
float h1(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }
vec3 h3(float n){ return vec3(h1(n), h1(n+17.31), h1(n+41.97)); }
const float LW = 6.28318530718/25.0;   // 全片 25 秒；所有频率取它的整数倍
// 卷曲噪声：向量势 A 由正弦波叠加，curl(A) 天然无散度，像流体一样翻卷
vec3 curlN(vec3 p, float t){
  vec3 c = vec3(0.0); vec3 K; float s;
  K = vec3( 1.7, 2.3, 1.1); s = cos(dot(K,p) + t*LW*3.0 + 0.0); c.y += K.z*s; c.z -= K.y*s;
  K = vec3(-2.9, 1.3, 2.1); s = cos(dot(K,p) + t*LW*5.0 + 1.3); c.y += K.z*s; c.z -= K.y*s;
  K = vec3( 2.1,-1.6, 1.9); s = cos(dot(K,p) + t*LW*4.0 + 2.1); c.x -= K.z*s; c.z += K.x*s;
  K = vec3( 1.2, 2.8,-2.4); s = cos(dot(K,p) + t*LW*6.0 + 0.7); c.x -= K.z*s; c.z += K.x*s;
  K = vec3(-1.4, 2.2, 1.8); s = cos(dot(K,p) + t*LW*3.0 + 4.2); c.x += K.y*s; c.y -= K.x*s;
  K = vec3( 2.6, 1.1,-1.7); s = cos(dot(K,p) + t*LW*7.0 + 3.3); c.x += K.y*s; c.y -= K.x*s;
  return c*0.12;
}
vec3 rotAxis(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v*c + cross(k, v)*s + k*dot(k, v)*(1.0-c); }
`;
