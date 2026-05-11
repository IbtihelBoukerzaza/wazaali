export class ChatService {
  static async sendMessage(message, conversationHistory = []) {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
      
      // Simple fallback responses for common questions
      const fallbackResponses = {
        'مرحباً': 'مرحباً بك! أنا مساعد وزعلي. كيف يمكنني مساعدتك اليوم؟',
        'كيف أجد منتجات': 'للعثور على منتجات الألبان، اذهب إلى شاشة "الملابن" أو استخدم خريطة التطبيق للبحث عن المصانع القريبة.',
        'كيف أتابع طلبي': 'لمتابعة طلباتك، اذهب إلى شاشة "طلباتي" من القائمة السفلية.',
        'ما هو وزعلي': 'وزعلي هو تطبيق لربط أصحاب المتاجر بأصحاب مصانع الألبان لتسهيل عملية الطلب والتوصيل.',
      };

      // Check for simple fallback responses first
      const lowerMessage = message.toLowerCase().trim();
      for (const [key, response] of Object.entries(fallbackResponses)) {
        if (lowerMessage.includes(key)) {
          return response;
        }
      }

      const messages = [
        {
          role: 'system',
          content: `أنت مساعد متخصص لتطبيق وزعلي - منصة سوق للألبان في الجزائر. التطبيق يحتوي على 5 شاشات رئيسية في القائمة السفلية: الرئيسية، الملابن، الخريطة، طلباتي، وحسابي.

          للمالكين (Shop Owners): يساعدون في البحث عن مصانع الألبان في شاشة "الملابن"، استخدام الخريطة للمواقع، تتبع الطلبات في "طلباتي"، وإدارة الحساب في "حسابي".

          لأصحاب المصانع (Dairy Owners): لديهم شاشة خاصة لإدارة المنتجات (إضافة، تعديل، حذف)، معالجة الطلبات (قبول، رفض، تحديث الحالة)، وعرض الإيرادات والإحصائيات.

          للمسؤولين (Admin): لديهم لوحة تحكم لإدارة المستخدمين (الموافقة، الرفض)، المصانع، المنتجات، الطلبات، وإحصائيات النظام.

          أجب دائماً باللغة العربية وبشكل محدد للتطبيق. استخدم أسماء الشاشات الفعلية: "الرئيسية"، "الملابن"، "الخريطة"، "طلباتي"، "حسابي". كن مفيداً ومختصراً.`
        },
        { role: 'user', content: message }
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages,
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        console.error('API Response status:', response.status);
        const errorText = await response.text();
        console.error('API Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'عذراً، لم أتمكن من معالجة طلبك. حاول مرة أخرى.';
    } catch (error) {
      console.error('Chat service error:', error);
      
      // Return a helpful fallback response
      if (message.toLowerCase().includes('مرحبا')) {
        return 'مرحباً بك! أنا مساعد وزعلي. كيف يمكنني مساعدتك اليوم؟';
      } else if (message.toLowerCase().includes('منتج')) {
        return 'للبحث عن منتجات، استخدم شاشة "الملابن" أو الخريطة للعثور على المصانع القريبة.';
      } else if (message.toLowerCase().includes('طلب')) {
        return 'لمتابعة طلباتك، اذهب إلى شاشة "طلباتي" من القائمة السفلية.';
      } else {
        return 'عذراً، حدث خطأ. حاول مرة أخرى أو استخدم الخيارات المتاحة في التطبيق.';
      }
    }
  }
}
