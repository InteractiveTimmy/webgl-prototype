precision mediump float;
// NOTE|OLD: attribute vec3 vertColor; // color
// NOTE|OLD: varying vec3 fragColor;

attribute vec3 vertPosition; // position 2d
attribute vec2 vertTexCoord;

varying vec2 fragTexCoord;
uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;

void main()
{
// NOTE|OLD:   fragColor = vertColor; // for color
  fragTexCoord = vertTexCoord;
  gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
}
