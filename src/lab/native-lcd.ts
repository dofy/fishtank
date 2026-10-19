import { Color, MeshSimple, Shader, Texture } from 'pixi.js'
import type { SceneView } from '../render/scene'
import type { SceneColors } from '../render/theme'

/** A GPU dot panel: constant four-vertex geometry, including grid, ridge, sand and beams. */
export class NativeLcd {
  readonly mesh: MeshSimple
  private readonly shader: Shader
  constructor(w: number, h: number, cell: number, colors: SceneColors, night: boolean) {
    const rgb = (value: string) => new Float32Array(new Color(value).toArray())
    this.shader = Shader.from({ gl: {
      vertex: `precision highp float;
        in vec2 aPosition; in vec2 aUV; out vec2 vUV;
        uniform mat3 uProjectionMatrix; uniform mat3 uWorldTransformMatrix; uniform mat3 uTransformMatrix;
        void main(){vec3 p=uProjectionMatrix*uWorldTransformMatrix*uTransformMatrix*vec3(aPosition,1.0);gl_Position=vec4(p.xy,0.0,1.0);vUV=aUV;}`,
      fragment: `precision highp float;
        in vec2 vUV; out vec4 finalColor;
        uniform vec2 uSize; uniform float uCell; uniform float uTime; uniform float uNight;
        uniform vec4 uWater; uniform vec4 uDecor; uniform vec4 uAccent; uniform vec4 uInk; uniform vec4 uSand;
        bool cone(float x,float y,float lamp){
          float p=(y-uCell*3.0)/max(1.0,uSize.y-uCell*7.0);
          float halfSpan=uCell*2.0+p*uSize.x*0.14;
          return y>=uCell*3.0&&y<uSize.y-uCell*4.0&&abs(x-lamp)<halfSpan;
        }
        void main(){
          vec2 p=vUV*uSize; vec2 g=floor(p/uCell); vec2 origin=g*uCell;
          bool dot=mod(p.x,uCell)<uCell-1.0&&mod(p.y,uCell)<uCell-1.0;
          vec4 color=uWater;
          if(dot){
            color=uDecor;
            float ridge=sin(origin.x*.012+.7)*uSize.y*.12+cos(origin.x*.027-.8)*uSize.y*.05;
            float ridgeTop=floor((uSize.y*.72-ridge)/uCell+.5)*uCell;
            if(origin.y>=ridgeTop&&origin.y<uSize.y-uCell*4.0&&mod(g.x,2.0)==0.0&&mod(g.y,2.0)==0.0)color=uAccent;
            float progress=(origin.y-uCell*3.0)/max(1.0,uSize.y-uCell*7.0);
            bool mask=progress<.45?mod(g.x+g.y,2.0)==0.0:mod(g.x,2.0)==0.0&&mod(g.y,2.0)==0.0;
            bool beam=uSize.x<380.0?(cone(origin.x,origin.y,floor(uSize.x*.28/uCell+.5)*uCell)||cone(origin.x,origin.y,floor(uSize.x*.72/uCell+.5)*uCell)):
              (cone(origin.x,origin.y,floor(uSize.x*.22/uCell+.5)*uCell)||cone(origin.x,origin.y,floor(uSize.x*.5/uCell+.5)*uCell)||cone(origin.x,origin.y,floor(uSize.x*.78/uCell+.5)*uCell));
            if(uNight>.5&&mask&&beam)color=uAccent;
            float waterline=floor((6.0+sin(origin.x*.05+uTime)*2.0)/uCell+.5)*uCell+uCell*2.0;
            if(abs(origin.y-waterline)<.1)color=uInk;
            if(origin.y>=uSize.y-uCell*4.0&&origin.y<=uSize.y-uCell*2.0){if(origin.y>uSize.y-uCell*4.0||mod(g.x,2.0)==0.0)color=uSand;}
          }
          finalColor=color;
        }`,
    }, resources: { panelUniforms: {
      uSize: { value: new Float32Array([w, h]), type: 'vec2<f32>' },
      uCell: { value: cell, type: 'f32' }, uTime: { value: 0, type: 'f32' }, uNight: { value: night ? 1 : 0, type: 'f32' },
      uWater: { value: rgb(colors.waterTop), type: 'vec4<f32>' }, uDecor: { value: rgb(colors.decor), type: 'vec4<f32>' },
      uAccent: { value: rgb(colors.accent), type: 'vec4<f32>' }, uInk: { value: rgb(colors.ink), type: 'vec4<f32>' }, uSand: { value: rgb(colors.sand), type: 'vec4<f32>' },
    } } })
    this.mesh = new MeshSimple({ texture: Texture.WHITE, vertices: new Float32Array([0, 0, w, 0, w, h, 0, h]), uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), indices: new Uint32Array([0, 1, 2, 0, 2, 3]) })
    this.mesh.shader = Object.assign(this.shader, { texture: Texture.WHITE })
  }
  update(view: SceneView): void { this.shader.resources.panelUniforms.uniforms.uTime = view.reducedMotion ? 0 : view.time }
  destroy(): void {
    delete this.shader.groups[100]
    delete this.shader.groups[101]
    this.shader.destroy()
    const geometry = this.mesh.geometry
    this.mesh.destroy()
    geometry.destroy()
  }
}
