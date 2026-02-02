def get_josa_en(kstr):
    k = kstr[-1]
    josa = {}
    if "가" <= k <= "힣":
        if (ord(k) - ord("가")) % 28 > 0:
            josa["eunVSneun"] = "은"
            josa["liVSka"] = "이"
            josa["eulVSleul"] = "을"
            josa["kwaVSwa"] = "과"
            josa["raVSir"] = "이라"
            josa["rangVSirang"] = "이랑"
            josa["kaVSika"] = "이가"
            josa["yeoutVSiyeout"] = "이었"
            josa["koVSrako"] = "이라고"
            josa["roVSeuro"] = "으로"
        else:
            josa["eunVSneun"] = "는"
            josa["liVSka"] = "가"
            josa["eulVSleul"] = "를"
            josa["kwaVSwa"] = "와"
            josa["raVSir"] = "라"
            josa["rangVSirang"] = "랑"
            josa["kaVSika"] = "가"
            josa["yeoutVSiyeout"] = "였"
            josa["koVSrako"] = "라고"
            josa["roVSeuro"] = "로"
    else:
        josa["eunVSneun"] = "는"
        josa["liVSka"] = "가"
        josa["eulVSleul"] = "를"
        josa["kwaVSwa"] = "와"
        josa["raVSir"] = "이라"
        josa["rangVSirang"] = "랑"
        josa["kaVSika"] = "이가"
        josa["yeoutVSiyeout"] = "이었"
        josa["koVSrako"] = "이라고"
        josa["roVSeuro"] = "으로"

    return josa


def get_josa(kstr):
    k = kstr[-1]
    josa = {}
    if "가" <= k <= "힣":
        if (ord(k) - ord("가")) % 28 > 0:
            josa["은/는"] = "은"
            josa["이/가"] = "이"
            josa["을/를"] = "을"
            josa["과/와"] = "과"
            josa["라/이라"] = "이라"
            josa["랑/이랑"] = "이랑"
            josa["가/이가"] = "이가"
            josa["였/이었"] = "이었"
            josa["고/라고"] = "이라고"
            josa["로/으로"] = "으로"
        else:
            josa["은/는"] = "는"
            josa["이/가"] = "가"
            josa["을/를"] = "를"
            josa["과/와"] = "와"
            josa["라/이라"] = "라"
            josa["랑/이랑"] = "랑"
            josa["가/이가"] = "가"
            josa["였/이었"] = "였"
            josa["고/라고"] = "라고"
            josa["로/으로"] = "로"
    else:
        josa["은/는"] = "는"
        josa["이/가"] = "가"
        josa["을/를"] = "를"
        josa["과/와"] = "와"
        josa["라/이라"] = "이라"
        josa["랑/이랑"] = "랑"
        josa["가/이가"] = "이가"
        josa["였/이었"] = "이었"
        josa["고/라고"] = "이라고"
        josa["로/으로"] = "으로"

    return josa
