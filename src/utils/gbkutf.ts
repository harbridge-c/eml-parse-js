export const Dig2Dec = (s: string) => {
    let retV = 0;
    if (s.length == 4) {
        for (let i = 0; i < 4; i++) {
            retV += eval(s.charAt(i)) * Math.pow(2, 3 - i);
        }
        return retV;
    }
    return -1;
};

export const Hex2Utf8 = (s: string) => {
    let retS = '';
    let tempS = '';
    let ss = '';
    if (s.length == 16) {
        tempS = '1110' + s.substring(0, 4);
        tempS += '10' + s.substring(4, 10);
        tempS += '10' + s.substring(10, 16);
        let sss = '0123456789ABCDEF';
        for (let i = 0; i < 3; i++) {
            retS += '%';
            ss = tempS.substring(i * 8, (eval(i.toString()) + 1) * 8);
            retS += sss.charAt(Dig2Dec(ss.substring(0, 4)));
            retS += sss.charAt(Dig2Dec(ss.substring(4, 8)));
        }
        return retS;
    }
    return '';
};

export const Dec2Dig = (n1: number) => {
    let s = '';
    let n2 = 0;
    for (let i = 0; i < 4; i++) {
        n2 = Math.pow(2, 3 - i);
        if (n1 >= n2) {
            s += '1';
            n1 = n1 - n2;
        } else {
            s += '0';
        }
    }
    return s;
};

export const Str2Hex = (s: string) => {
    let c = '';
    let n;
    let ss = '0123456789ABCDEF';
    let digS = '';
    for (let i = 0; i < s.length; i++) {
        c = s.charAt(i);
        n = ss.indexOf(c);
        digS += Dec2Dig(eval(n.toString()));
    }
    return digS;
};

export const GB2312UTF8 = (s1: string) => {
    let s = escape(s1);
    let sa = s.split('%');
    let retV = '';
    if (sa[0] != '') {
        retV = sa[0];
    }
    for (let i = 1; i < sa.length; i++) {
        if (sa[i].substring(0, 1) == 'u') {
            retV += Hex2Utf8(Str2Hex(sa[i].substring(1, 5)));
            if (sa[i].length) {
                retV += sa[i].substring(5);
            }
        } else {
            retV += unescape('%' + sa[i]);
            if (sa[i].length) {
                retV += sa[i].substring(5);
            }
        }
    }
    return retV;
};
