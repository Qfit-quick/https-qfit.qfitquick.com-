import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

export function initBilling() {
  const tossButton = document.querySelector("#toss-billing-button");
  const kakaoButton = document.querySelector("#kakao-billing-button");

  // 1. 토스페이먼츠 카드 등록 버튼
  if (tossButton) {
    tossButton.addEventListener("click", async () => {
      try {
        tossButton.disabled = true;

        const response = await fetch(
          "http://localhost:5173/api/billing/toss/prepare",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Authorization: `Bearer ${accessToken}` (필요 시 토큰 첨부)
            },
          },
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`결제 준비 실패: ${error}`);
        }

        const { customerKey, clientKey } = await response.json();
        if (!customerKey || !clientKey) {
          throw new Error(
            "결제 키 정보(customerKey/clientKey)가 누락되었습니다.",
          );
        }

        const tossPayments = await loadTossPayments(clientKey);
        const payment = tossPayments.payment({ customerKey });

        await payment.requestBillingAuth({
          method: "CARD",
          successUrl: `${window.location.origin}/billing/success`,
          failUrl: `${window.location.origin}/billing/fail`,
        });
      } catch (error) {
        console.error("토스 결제창 실행 실패:", error);
        alert(
          error instanceof Error ? error.message : "결제창을 열 수 없습니다.",
        );
      } finally {
        tossButton.disabled = false;
      }
    });
  }

  // 2. 카카오페이 연결 버튼
  if (kakaoButton) {
    kakaoButton.addEventListener("click", async () => {
      try {
        kakaoButton.disabled = true;

        const response = await fetch(
          "http://localhost:5173/api/billing/kakao/prepare",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Authorization: `Bearer ${accessToken}` (필요 시 토큰 첨부)
            },
          },
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`카카오페이 준비 실패: ${error}`);
        }

        const data = await response.json();
        const redirectUrl = isMobile()
          ? data.nextRedirectMobileUrl
          : data.nextRedirectPcUrl;

        if (!redirectUrl) {
          throw new Error("카카오페이 결제 페이지 URL을 전달받지 못했습니다.");
        }

        // 카카오페이 결제 페이지로 이동
        window.location.href = redirectUrl;
      } catch (error) {
        console.error("카카오페이 실행 실패:", error);
        alert(
          error instanceof Error
            ? error.message
            : "카카오페이를 실행할 수 없습니다.",
        );
        kakaoButton.disabled = false;
      }
    });
  }
}

// 모바일 기기 판별 Helper
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}
