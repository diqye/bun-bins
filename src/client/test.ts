const response = await fetch("https://s2.aigei.com/src/aud/mp3/1c/1c521bf7cd3b492cb7ac80e0c3167988.mp3?e=1765429740&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:oBdMRVZf6QmwkAUOJYPFm_3fI1o=", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en",
    "priority": "i",
    "range": "bytes=0-",
    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "audio",
    "sec-fetch-mode": "no-cors",
    "sec-fetch-site": "same-site",
    "cookie": "gei_d_u=528aec61ecc74ed4aec5a5f0f0c11daf; gei_d_1=d9e38d327d1093e892114f1f63851caa93a43874519a51a9e777beda2a308b878ea41cc388ac445d036900e520d75a0f20403f0b394ae919a79336affabb54d3; hhhssi1ill1i=5a05bc3f5b21a5ef8ff883b447dab531; oOO0OO0oOO00oo0o=true; geiweb-v=zZ+S93HA1QePGphogZWywSUiuH0vfeGoJ5zsCYon2EU4Iu5akEJehidTrj7h1dm4; OooOO000oOOO00o=061a497e48e74b85bd136ea581ee7433; Hm_lvt_0e0ebfc9c3bdbfdcaa48ccbc43e864f9=1765426050; HMACCOUNT=E029398080BFD2F6; Hm_lpvt_0e0ebfc9c3bdbfdcaa48ccbc43e864f9=1765426056",
    "Referer": "https://www.aigei.com/"
  },
  "body": null,
  "method": "GET"
});

await Bun.write("start.mp3",response)