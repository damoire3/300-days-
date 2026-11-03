import wave, struct, math, os
R = 22050
def tone(buf, t0, dur, f0, f1, vol, kind='sine'):
    n = int(dur * R); s0 = int(t0 * R)
    ph = 0.0
    for i in range(n):
        if s0 + i >= len(buf): break
        f = f0 * (f1 / f0) ** (i / max(n, 1))
        ph += 2 * math.pi * f / R
        v = math.sin(ph) if kind == 'sine' else (2 / math.pi) * math.asin(math.sin(ph))
        e = min(1, i / (0.01 * R)) * math.exp(-4 * i / n) if kind != 'sine' or True else 1
        buf[s0 + i] += vol * v * e
def save(name, buf):
    os.makedirs('android/app/src/main/res/raw', exist_ok=True)
    m = max(0.001, max(abs(x) for x in buf))
    w = wave.open('android/app/src/main/res/raw/' + name, 'wb')
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(R)
    w.writeframes(b''.join(struct.pack('<h', int(x / m * 26000)) for x in buf)); w.close()
L = 4 * R
b = [0.0] * L   # 1 perroquet
for rep in (0, 0.9, 1.8):
    tone(b, rep, .16, 1400, 2600, .8); tone(b, rep + .22, .14, 1800, 3000, .7); tone(b, rep + .45, .12, 1200, 2200, .6)
save('erio1.wav', b)
b = [0.0] * L   # 2 cloche
for k in (0, .9, 1.8):
    for f, v in ((880, 1), (1760, .5), (2430, .25)): tone(b, k, 1.4, f, f * .995, .8 * v)
save('erio2.wav', b)
b = [0.0] * L   # 3 marimba
for rep in (0, 2.0):
    for i, f in enumerate((523, 659, 784, 1047, 784, 659)): tone(b, rep + i * .22, .35, f, f, .8, 'tri')
save('erio3.wav', b)
print('sons ok')
