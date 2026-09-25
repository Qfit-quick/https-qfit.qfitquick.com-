import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

export function initBilling() {
  const button = document.querySelector("#billing-button");

  if (!button) return;

  button.addEventListener("click", async () => {
    try {
      button.disabled = true;

      // 1. Worker에서 customerKey + clientKey 받기
      const response = await fetch(
        "http://localhost:5173/api/billing/prepare",
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`결제 준비 실패: ${error}`);
      }

      const data = await response.json();

      const { customerKey, clientKey } = data;
      if (!customerKey) {
        throw new Error("customerKey가 없습니다.");
      }
      if (!clientKey) {
        throw new Error("clientKey가 없습니다.");
      }

      console.log("결제 준비 완료");
      console.log("customerKey:", customerKey);

      // 2. Toss SDK 초기화
      const tossPayments = await loadTossPayments(clientKey);

      // 3. 결제창 객체 생성
      const payment = tossPayments.payment({
        customerKey,
      });

      // 4. 자동결제 카드 등록창 열기
      await payment.requestBillingAuth({
        method: "CARD",

        // 카드 등록 성공 후 이동할 주소
        successUrl: `${window.location.origin}/billing/success`,

        // 카드 등록 실패/취소 후 이동할 주소
        failUrl: `${window.location.origin}/billing/fail`,
      });
    } catch (error) {
      console.error("결제창 실행 실패:", error);

      alert(
        error instanceof Error ? error.message : "결제창을 열 수 없습니다.",
      );

      button.disabled = false;
    }
  });
}
