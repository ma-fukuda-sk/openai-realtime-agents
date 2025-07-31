import { RealtimeItem, tool } from '@openai/agents/realtime';


// サンプルデータのインポートは実際のAPI呼び出しを使用するため削除

export const supervisorAgentInstructions = `あなたは、すかいらーく電話注文受付システムのスーパーバイザーエージェントです。顧客情報確認エージェントをサポートし、顧客登録の確認と新規登録を適切に処理する役割を担います。

# 基本指示
- 顧客情報確認エージェントから依頼されたタスクを正確に実行してください
- 必要に応じてツールを呼び出し、その結果に基づいて適切な応答を作成してください
- あなたのメッセージは顧客情報確認エージェントによってそのまま読み上げられるため、顧客に直接話しかけるような自然な口調で作成してください

# 利用可能なツール
- get_customer: 電話番号で顧客情報を検索
- create_customer: 新規顧客情報を登録  
- session_finished: 注文受付担当への引き継ぎ
- add_menu_to_cart: メニューをカートに追加
- create_cart: 新しいカートを作成
- get_menus: 利用可能なメニュー一覧を取得
- search_menu: 商品名でメニューを検索する
- get_cart_menus: カートに登録されている商品の名称と数量を取得
- calculate_total_amount: カートの注文の合計金額を計算
- post_order: お客様の注文を確定する

# 応対フロー

## 顧客情報検索
電話番号が提供された場合：
1. get_customerツールを使用して顧客情報を検索
2. 登録情報が見つかった場合：「ありがとうございます。ご登録いただいております、[顧客名]様でいらっしゃいますね。」と応答し、session_finishedを呼び出す
3. 登録情報が見つからない場合：「ありがとうございます。初めてのご利用ですね。恐れ入りますが、ご注文のためにお名前とご住所をお伺いしてもよろしいでしょうか？」

## 新規顧客登録
氏名と住所が提供された場合：
1. 聞き取った情報を復唱確認：「[氏名]様、ご住所は[住所]でよろしいでしょうか？」
2. 顧客の同意後、create_customerツールを使用して登録
3. 登録完了後：「ご登録ありがとうございます。それではご注文を承ります。」と伝え、session_finishedを呼び出す

## メニュー情報提供
顧客がメニューについて問い合わせた場合：

### 全メニュー表示の場合：
1. get_menusツールを使用してメニュー一覧を取得
2. 「本日ご用意しているメニューをご案内いたします」などの自然な口調で情報提供

### 特定商品の検索の場合：
1. 顧客が具体的な商品名を言った場合は、search_menuツールを使用して該当商品を検索
2. 検索結果に基づいて適切なメニューを案内
3. 複数の候補がある場合は選択肢を提示
4. 見つからない場合は類似商品や人気商品を提案

## メニュー注文処理
メニューの注文が確定した場合：
1. 顧客が商品名を言った場合：
   - search_menuツールを使用して該当商品を検索
   - 検索結果から最適な商品を特定
   - 顧客に確認：「[商品名]でよろしいでしょうか？」
2. 顧客から数量を確認（明示されていない場合は1個とする）
3. カートが存在しない場合：create_cartツールを使用してカートを作成（storeNoが必要）
4. add_menu_to_cartツールを使用してメニューをカートに追加（menuNoとquantityを指定）
5. 追加完了後：「[メニュー名] [数量]個をカートに追加いたしました。他にご注文はございますか？」と応答

注意：カート作成前に必ずget_customerまたはcreate_customerを実行して顧客情報を確認してください。顧客IDは自動的に保存されます。

## 注文確認と完了処理
顧客が「注文は以上です」「注文を完了してください」といった意思を示した場合：
1. get_cart_menusツールを使用してカート内容を取得
2. 注文内容を顧客に読み上げて確認：「ご注文内容を確認いたします。[商品名]が[数量]個、[商品名]が[数量]個でございます。」
3. calculate_total_amountツールを使用して合計金額を計算し、顧客に伝える：「合計金額は[金額]円です。」
4. 顧客の最終確認を取る：「以上でよろしいでしょうか？」
5. 顧客が同意したら、post_orderツールを使用して注文を確定
6. 注文完了の挨拶：「ご注文ありがとうございました。準備ができましたらお届けいたします。」

# 応答指示
- 丁寧で親しみやすい口調を維持してください
- 音声会話であることを考慮し、簡潔で自然な話し言葉を使用してください
- 顧客情報の取り扱いには細心の注意を払ってください
- 必要な情報が不足している場合は、顧客に追加情報を求めてください
- 最終応答では # Message フォーマットを使用してください

# 応答例
## 顧客情報が見つかった場合
# Message
ありがとうございます。ご登録いただいております、田中太郎様でいらっしゃいますね。

## 新規顧客の場合  
# Message
ありがとうございます。初めてのご利用ですね。恐れ入りますが、ご注文のためにお名前とご住所をお伺いしてもよろしいでしょうか？
`;

export const supervisorAgentTools = [
  {
    type: "function",
    name: "get_customer",
    description: "電話番号からユーザー情報を取得する。電話番号は何桁でも許可するようにしてください。",
    parameters: {
      type: "object",
      properties: {
        phone_number: {
          type: "string",
          description: "電話番号"
        }
      },
      required: ["phone_number"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_customer",
    description: "ユーザー情報を登録する。この関数はお客様の電話番号の登録がない場合に使用してください",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "氏名"
        },
        address: {
          type: "string",
          description: "住所"
        },
        phone_number: {
          type: "string",
          description: "電話番号"
        }
      },
      required: ["name", "address", "phone_number"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "session_finished",
    description: "お客様情報が確認できるか、新規の登録が完了した時に呼び出す。",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "add_menu_to_cart",
    description: "カートオブジェクトにメニューを追加する。カートIDがない場合は自動でカートを作成する",
    parameters: {
      type: "object",
      properties: {
        menuNo: {
          type: "integer",
          description: "メニューNo（32bit符号付き整数）"
        },
        quantity: {
          type: "integer",
          description: "数量（32bit符号付き整数）"
        }
      },
      required: ["menuNo", "quantity"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_cart",
    description: "新しいカートを作成する。事前に顧客情報を取得または登録しておく必要がある",
    parameters: {
      type: "object",
      properties: {
        storeNo: {
          type: "integer",
          description: "店舗No（32bit符号付き整数、通常は1を指定）"
        }
      },
      required: ["storeNo"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_menus",
    description: "利用可能なメニュー一覧を取得する",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_menu",
    description: "商品名でメニューを検索する。顧客が注文したい商品名を指定して該当するメニューを探す",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "検索したい商品名"
        }
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_cart_menus",
    description: "カートに登録されている商品の名称と数量を取得する",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "calculate_total_amount",
    description: "カートの注文の合計金額を計算する",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "post_order",
    description: "お客様の注文を全て聞いたら、カートの注文を確定する",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

async function fetchResponsesMessage(body: any) {
  const response = await fetch('/api/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // 順次ツール呼び出しを強制する従来の動作を保持
    body: JSON.stringify({ ...body, parallel_tool_calls: false }),
  });

  if (!response.ok) {
    console.warn('Server returned an error:', response);
    return { error: 'Something went wrong.' };
  }

  const completion = await response.json();
  return completion;
}

// 関数呼び出しは現在 /api/responses ルートでサーバーサイドで処理される

/**
 * Responses APIから返された関数呼び出しを反復的に処理し、
 * スーパーバイザーが最終的なテキスト回答を生成するまで続ける。その回答を文字列として返す。
 */
async function handleToolCalls(
  body: any,
  response: any,
  addBreadcrumb?: (title: string, data?: any) => void,
) {
  let currentResponse = response;

  while (true) {
    if (currentResponse?.error) {
      return { error: 'Something went wrong.' } as any;
    }

    const outputItems: any[] = currentResponse.output ?? [];

    // 出力内のすべての関数呼び出しを収集
    const functionCalls = outputItems.filter((item) => item.type === 'function_call');

    if (functionCalls.length === 0) {
      // これ以上の関数呼び出しなし - アシスタントの最終メッセージを構築して返す
      const assistantMessages = outputItems.filter((item) => item.type === 'message');

      const finalText = assistantMessages
        .map((msg: any) => {
          const contentArr = msg.content ?? [];
          return contentArr
            .filter((c: any) => c.type === 'output_text')
            .map((c: any) => c.text)
            .join('');
        })
        .join('\n');

      return finalText;
    }

    // リクエストボディに関数呼び出しを追加 - サーバーサイドで処理される
    for (const toolCall of functionCalls) {
      const fName = toolCall.name;
      const args = JSON.parse(toolCall.arguments || '{}');

      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call: ${fName}`, args);
      }

      // リクエストボディに関数呼び出しを追加 - 実行はサーバーサイドで行われる
      body.input.push({
        type: 'function_call',
        call_id: toolCall.call_id,
        name: toolCall.name,
        arguments: toolCall.arguments,
      });
    }

    // ツール出力を含むフォローアップリクエストを作成
    currentResponse = await fetchResponsesMessage(body);
  }
}

export const getNextResponseFromSupervisor = tool({
  name: 'getNextResponseFromSupervisor',
  description:
    'エージェントが重要な決定に直面した際の次の応答を決定する。高度に知的なスーパーバイザーエージェントによって生成される。次に何をすべきかを説明するメッセージを返す。',
  parameters: {
    type: 'object',
    properties: {
      relevantContextFromLastUserMessage: {
        type: 'string',
        description:
          'ユーザーの最新メッセージで説明された重要な情報。最後のメッセージが利用できない可能性があるため、スーパーバイザーエージェントに完全なコンテキストを提供することが重要。ユーザーメッセージが新しい情報を追加していない場合は省略可能。',
      },
    },
    required: ['relevantContextFromLastUserMessage'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { relevantContextFromLastUserMessage } = input as {
      relevantContextFromLastUserMessage: string;
    };

    const addBreadcrumb = (details?.context as any)?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;

    const history: RealtimeItem[] = (details?.context as any)?.history ?? [];
    const filteredLogs = history.filter((log) => log.type === 'message');

    const body: any = {
      model: 'gpt-4.1',
      input: [
        {
          type: 'message',
          role: 'system',
          content: supervisorAgentInstructions,
        },
        {
          type: 'message',
          role: 'user',
          content: `==== Conversation History ====
          ${JSON.stringify(filteredLogs, null, 2)}
          
          ==== Relevant Context From Last User Message ===
          ${relevantContextFromLastUserMessage}
          `,
        },
      ],
      tools: supervisorAgentTools,
    };

    const response = await fetchResponsesMessage(body);
    if (response.error) {
      return { error: 'Something went wrong.' };
    }

    const finalText = await handleToolCalls(body, response, addBreadcrumb);
    if ((finalText as any)?.error) {
      return { error: 'Something went wrong.' };
    }

    return { nextResponse: finalText as string };
  },
});
  