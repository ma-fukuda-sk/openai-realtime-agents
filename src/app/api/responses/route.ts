import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Proxy endpoint for the OpenAI Responses API
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Process function calls if they exist
  if (body.input && Array.isArray(body.input)) {
    const processedInput = [];
    
    for (const item of body.input) {
      if (item.type === 'function_call') {
        // Add the function call as-is
        processedInput.push(item);
        
        // Execute the function call and add the output
        const result = await executeFunction(item.name, JSON.parse(item.arguments || '{}'));
        processedInput.push({
          type: 'function_call_output',
          call_id: item.call_id,
          output: JSON.stringify(result),
        });
        
        // Remove the original function call from further processing
        continue;
      }
      processedInput.push(item);
    }
    
    body.input = processedInput;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (body.text?.format?.type === 'json_schema') {
    return await structuredResponse(openai, body);
  } else {
    return await textResponse(openai, body);
  }
}

async function executeFunction(functionName: string, args: any) {
  switch (functionName) {
    case 'get_customer':
      return await getCustomer(args.phone_number);
    case 'create_customer':
      return await createCustomer(args.name, args.address, args.phone_number);
    case 'session_finished':
      return await sessionFinished();
    case 'add_menu_to_cart':
      return await addMenuToCart(args.menuNo, args.quantity);
    case 'create_cart':
      return await createCart(args.storeNo);
    case 'get_menus':
      return await getMenus();
    case 'search_menu':
      return await searchMenu(args.name);
    case 'get_cart_menus':
      return await getCartMenus();
    case 'post_order':
      return await postOrder();
    case 'calculate_total_amount':
      return await calculateTotalAmount();
    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

async function getCustomer(phoneNumber: string) {
  try {
    // ハイフンを除去して数字のみにする
    const cleanPhoneNumber = phoneNumber.replace(/-/g, '');
    
    const response = await fetch(`http://133.18.109.4/api/customers/?phoneNumber=${cleanPhoneNumber}`, {
      method: 'GET',
    });
    const data = await response.json();
    console.log(`get_customer: ${JSON.stringify(data)}`);
    
    if (data && Array.isArray(data) && data.length > 0) {
      const customer = data[0];
      const customerId = customer.id || customer.customerId;
      
      // 顧客IDを保存
      currentCustomerId = customerId;
      
      return {
        ...customer,
        customerId: customerId
      };
    } else {
      return { message: "登録がありません。" };
    }
  } catch (error) {
    console.error('get_customer error:', error);
    return { message: "顧客情報の取得に失敗しました。" };
  }
}

async function createCustomer(name: string, address: string, phoneNumber: string) {
  try {
    // ハイフンを除去して数字のみにする
    const cleanPhoneNumber = phoneNumber.replace(/-/g, '');
    
    const payload = {
      name: name,
      address: address,
      phoneNumber: cleanPhoneNumber,
      furigana: "",
      addressFurigana: "",
    };

    const response = await fetch('http://133.18.109.4/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 201) {
      const data = await response.json();
      console.log(`create_customer: ${JSON.stringify(data)}`);
      
      const customerId = data.id || data.customerId;
      // 顧客IDを保存
      currentCustomerId = customerId;
      
      return { 
        message: "登録が完了しました",
        customerId: customerId,
        data: data
      };
    } else {
      const errorData = await response.text();
      console.log(`create_customer failed: ${response.status} ${errorData}`);
      return { message: "登録に失敗しました" };
    }
  } catch (error) {
    console.error('create_customer error:', error);
    return { message: "登録に失敗しました" };
  }
}

async function sessionFinished() {
  return { message: "ありがとうございます。それでは、注文の詳細をお伺いします" };
}

// グローバル変数でセッション情報を管理（実際の実装では適切な状態管理を実装する）
let currentCartId: string | null = null;
let currentCustomerId: string | null = null;

async function addMenuToCart(menuNo: number, quantity: number) {
  try {
    // カートIDがない場合はエラーを返す
    if (!currentCartId) {
      return { 
        message: "カートが作成されていません。先にカートを作成してください。",
        requiresCart: true
      };
    }

    const response = await fetch(`http://133.18.109.4/api/carts/${currentCartId}/menus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        menuNo: menuNo,
        quantity: quantity
      }),
    });

    const data = await response.json();
    console.log(`add_menu_to_cart: ${JSON.stringify(data)}`);

    if (response.ok) {
      return { message: `メニューを${quantity}個カートに追加しました`, data: data };
    } else {
      return { message: "メニューの追加に失敗しました", error: data };
    }
  } catch (error) {
    console.error('add_menu_to_cart error:', error);
    return { message: "メニューの追加中にエラーが発生しました" };
  }
}

async function createCart(storeNo: number, customerId?: string) {
  try {
    // カスタマーIDが指定されていない場合は、保存されているIDを使用
    const useCustomerId = customerId || currentCustomerId;
    
    if (!useCustomerId) {
      return { 
        message: "顧客情報が見つかりません。先に顧客情報を確認または登録してください。",
        requiresCustomer: true
      };
    }

    const response = await fetch('http://133.18.109.4/api/carts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeNo: storeNo,
        customerId: useCustomerId
      }),
    });

    const data = await response.json();
    console.log(`create_cart: ${JSON.stringify(data)}`);

    if (response.ok) {
      // 作成されたカートIDを保存
      currentCartId = data.id || data.cartId;
      return { 
        message: "カートを作成しました", 
        cartId: currentCartId,
        data: data 
      };
    } else {
      return { message: "カートの作成に失敗しました", error: data };
    }
  } catch (error) {
    console.error('create_cart error:', error);
    return { message: "カート作成中にエラーが発生しました" };
  }
}

async function getMenus() {
  try {
    const response = await fetch('http://133.18.109.4/api/menus', {
      method: 'GET',
    });

    if (response.status === 200) {
      const data = await response.json();
      console.log(`get_menus: ${JSON.stringify(data)}`);
      return { menus: data };
    } else {
      console.log(`get_menus failed: ${response.status} ${response.statusText}`);
      return { message: "メニュー取得中にエラーが発生しました。もう一度試してください。" };
    }
  } catch (error) {
    console.error('get_menus error:', error);
    return { message: "メニュー取得中にエラーが発生しました。もう一度試してください。" };
  }
}

async function searchMenu(name: string) {
  try {
    if (!name) {
      return { message: "検索する商品名を指定してください。" };
    }

    // 商品名をURLエンコード
    const encodedName = encodeURIComponent(name);
    const response = await fetch(`http://133.18.109.4/api/menus?name=${encodedName}`, {
      method: 'GET',
    });

    if (response.status === 200) {
      const data = await response.json();
      console.log(`search_menu: ${JSON.stringify(data)}`);
      
      if (Array.isArray(data) && data.length > 0) {
        return { 
          menus: data,
          message: `「${name}」に関連するメニューが${data.length}件見つかりました。`
        };
      } else {
        return { 
          menus: [],
          message: `「${name}」に該当するメニューは見つかりませんでした。`
        };
      }
    } else {
      console.log(`search_menu failed: ${response.status} ${response.statusText}`);
      return { message: "メニュー検索中にエラーが発生しました。もう一度試してください。" };
    }
  } catch (error) {
    console.error('search_menu error:', error);
    return { message: "メニュー検索中にエラーが発生しました。もう一度試してください。" };
  }
}

async function getCartMenus() {
  try {
    if (!currentCartId) {
      return { 
        message: "カートが作成されていません。",
        requiresCart: true
      };
    }

    const response = await fetch(`http://133.18.109.4/api/carts/${currentCartId}/menus`, {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`get_cart_menus: ${JSON.stringify(data)}`);
      return { cartMenus: data };
    } else {
      return { message: "カート内容の取得に失敗しました" };
    }
  } catch (error) {
    console.error('get_cart_menus error:', error);
    return { message: "カート内容の取得中にエラーが発生しました" };
  }
}

async function postOrder() {
  try {
    if (!currentCartId) {
      return { 
        message: "カートが作成されていません。",
        requiresCart: true
      };
    }

    const response = await fetch('http://133.18.109.4/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cartId: currentCartId
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`post_order: ${JSON.stringify(data)}`);
      
      // 注文完了後はセッション情報をリセット
      currentCartId = null;
      currentCustomerId = null;
      
      return { message: "注文が完了しました。ありがとうございました。" };
    } else {
      return { message: "注文の確定に失敗しました" };
    }
  } catch (error) {
    console.error('post_order error:', error);
    return { message: "注文確定中にエラーが発生しました" };
  }
}

async function calculateTotalAmount() {
  try {
    if (!currentCartId) {
      return { 
        message: "カートが作成されていません。",
        requiresCart: true
      };
    }

    const response = await fetch(`http://133.18.109.4/api/carts/${currentCartId}/menus`, {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`calculate_total_amount: ${JSON.stringify(data)}`);
      
      // 合計金額を計算
      const totalAmount = data.reduce((sum: number, menu: any) => {
        return sum + (menu.price || 0);
      }, 0);
      
      return { 
        totalAmount: totalAmount,
        message: `合計金額は${totalAmount}円です。`
      };
    } else {
      return { message: "合計金額の計算に失敗しました" };
    }
  } catch (error) {
    console.error('calculate_total_amount error:', error);
    return { message: "合計金額の計算中にエラーが発生しました" };
  }
}

async function structuredResponse(openai: OpenAI, body: any) {
  try {
    const response = await openai.responses.parse({
      ...(body as any),
      stream: false,
    });

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('responses proxy error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 }); 
  }
}

async function textResponse(openai: OpenAI, body: any) {
  try {
    const response = await openai.responses.create({
      ...(body as any),
      stream: false,
    });

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('responses proxy error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
  