precision mediump float;
// NOTE|OLD: varying vec3 fragColor; // for color

varying vec2 fragTexCoord; // from vs
uniform sampler2D sampler; // samples image input

void main()
{
// NOTE|OLD:   gl_FragColor = vec4(fragColor, 1.0); // for color
  gl_FragColor = vec4(0.1, 0.1, 0.1, 1.0); // for color
// OLD gl_FragColor = texture2D(sampler, fragTexCoord);
}