const response = await fetch("https://www.aigei.com/f/d/audio_mp3", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en",
    "cccllpptttgt": "43bc612fe16e65006be4a83239b96361",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-requested-with": "XMLHttpRequest"
  },
  "referrer": "https://www.aigei.com/sound/class/jie_wei_yi/",
  "body": "v=0TXgpGbiknkw7ZsSv7PJulPcbLnX4cd620gTbe%2F3yZsM9324sgHJ11m8SOlD5aHgI2X7ZjkPQSysiXQywzT9S2XTTbr8f8DgOjIK4xhrlIyrWBfpRDA%2BJMA%2BG8ra%2FCuFrztMtBFsSchqT%2FlYIrGCzNIxrnzKmBxinDgTvzge%2BzOaEarP8tgSEGSseNSx%2FHeDQJw45kOwW767QI76yvCRWEBpYjV982Ve9GH9ZfjrQ7Ykm87C1Dds79qvD2HWlvcjPY7r3oiDK70PnZDcE%2B6CN6%2Bk%2B5dRa7mrOvuwJ%2BorViASlmVQUxgZf3mo99rn4gOoLEWpYBZEWM69otfTDQGz3EVPu4yw0CY5RFOSYNK2lgrfc%2FkgB45%2BEsmnCKXXn0depj0O2WgSmv2ZsPrsldqctltpLoTuGtcCAiEdn7JAe%2F%2F5QtILL08CiTqr4KA10Wo%2BHXql5m7p4VOmmc1xYEA8z%2FF%2BdyA2EEC1Pba74IPrktWf8thHvMS5fd1P1MIdqFwuG",
  "method": "POST",
  "mode": "cors",
  "credentials": "include"
});

if(response.ok == false) {
    console.error(response)
    console.log(await response.text())
}
Bun.write("a.mp3",response)