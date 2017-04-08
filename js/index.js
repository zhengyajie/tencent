~function (pro) {
    /*
     * '2017-1-12 17:10:3' => '2017年01月12日 17时10分03秒'
     *                     => '01-12 17:10'
     */
    function myFormatTime(template) {
        template = template || '{0}年{1}月{2}日 {3}时{4}分{5}秒';
        var _this = this,
            ary = _this.match(/\d+/g);
        //console.log(ary);//->["2017", "1", "12", "17", "10", "3"]
        template = template.replace(/\{(\d)\}/g, function () {
            /*var n = arguments[1],
             val = ary[n] || '00';
             val.length < 2 ? val = '0' + val : null;
             return val;*/
            return (ary[arguments[1]] || '00').length < 2 ? '0' + ary[arguments[1]] : ary[arguments[1]];

        });
        return template;
    }

    pro.myFormatTime = myFormatTime;
    console.log(arguments[1]);
}(String.prototype);



/*
 * 计算MAIN区域的高度
 *  ->MAIN的高度
 *  ->MENU NAV的高度
 */
~function () {
    var $header = $('.header'),
        $main = $('.main'),
        $menuNav = $main.children('.menuNav');

    function fn() {
        var winH = $(window).innerHeight(),
            headerH = $header.outerHeight(),
            resultH = winH - headerH - 40;//->40是MARGIN值
        $main.css('height', resultH);
        $menuNav.css('height', resultH - 2);
    }

    fn();
    $(window).on('resize', fn);//->当浏览器窗口大小发生改变,触发这个事件RESIZE
}();

/*
 * MENU区域的操作(我们统一使用最简单的设计模式构建:单例模式->命令模式)
 */
var menuRender = (function () {
    var $menuNav = $('.menuNav'),
        $link = $menuNav.find('a'),
        exampleIS = null;

    //->completeScroll:实现区域的局部滚动
    function completeScroll() {
        exampleIS = new IScroll('.menuNav', {
            scrollbars: true,//->显示滚动条
            fadeScrollbars: true,//->操控的时候在展示滚动条,不操作的时候隐藏滚动条
            mouseWheel: true,//->开启鼠标滚轮的操控
            bounce: false,//->禁止到达边界的反弹效果,默认是TRUE
            useTransform: true//->开始TRANSFORM滚动,默认就是开启的,写成FALSE是禁止
        });
    }

    //->specificLocation:根据HASH值定位到具体的某个位置
    function specificLocation() {
        var nowURL = window.location.href,
            hash = nowURL.substr(nowURL.lastIndexOf('#'));

        //->在所有A中找到和对应HASH值相同的一项,如果找不到选中第一个A
        var $tar = $link.filter('[href="' + hash + '"]');
        $tar.length === 0 ? $tar = $link.eq(0) : null;
        $tar.addClass('bg');
        exampleIS.scrollToElement($tar[0], 300);

        //->控制右侧日历展示不同的信息
        calendarRender.init($tar.attr('data-id'));
    }

    //->bindEvent:给所有的A绑定点击事件
    function bindEvent() {
        $link.on('click', function () {
            //->点击的是谁,让谁拥有选中的样式,而其余的移除选中样式
            //->使用JQ的链式查找：$(this).addClass('bg').parent().siblings().children('a').removeClass('bg');
            var _this = this;
            $link.each(function (index, item) {
                item === _this ? $(item).addClass('bg') : $(item).removeClass('bg');
            });

            //->控制右侧日历展示不同的信息
            calendarRender.init($(_this).attr('data-id'));
        });
    }

    return {
        init: function () {
            /*
             * 1、实现局部滚动
             * 2、根据当前URL的HASH值定位到具体的A标签
             * 3、给所有的A标签绑定点击事件
             */
            completeScroll();
            specificLocation();
            bindEvent();
        }
    }
})();

/*
 * CALENDAR区域的操作
 */
var calendarRender = (function () {
    var $calendarPlan = $.Callbacks();//->JQ中创建一个计划表,然后使用ADD/REMOVE方法向计划表中增加方法和移除方法,使用FIRE方法通知这些方法执行
    var $calendar = $('.calendar'),
        $wrapper = $calendar.find('.wrapper'),
        $btn = $calendar.find('.btn'),
        $link = null;
    var maxL = 0, minL = 0;

    //->数据绑定
    $calendarPlan.add(function (today, data, columnId) {
        var str = '';
        $.each(data, function (index, item) {
            //->data-time:设置一个自定义属性存储代表的时间,以后点击这个A,如果需要使用时间,直接从自定义属性上获取即可
            str += '<li><a href="javascript:;" data-time="' + item.date + '">';
            str += '<span class="week">' + item.weekday + '</span>';
            str += '<span class="date">' + item.date.myFormatTime('{1}-{2}') + '</span>';
            str += '</a></li>';
        });
        $wrapper.html(str).css('width', data.length * 110);

        //->数据绑定完成后获取所有的A
        $link = $wrapper.find('a');
        minL = -(data.length - 7) * 110;
    });

    //->定位到今天日期的位置
    $calendarPlan.add(function (today, data, columnId) {
        /*
         * 1、首先在所有的A中筛选和今天日期相匹配的一项,但是不一定能获取到,例如:今天没有比赛,那么在A中是没有今天日期的
         * 2、我们找到今天日期往后最靠近的那一项做展示(展示在七个中间即可)：循环所有的A标签,获取每一个A代表的日期,和今天的日期进行比较,直到遇到一个比今天日期大的,就是我们想要的.
         * 3、上面操作完成,如果发现一个比TODAY大的都没有,我们直接选中最后一个A即可
         * 4、让当前选中的A在中间展示
         */
        var $tar = $link.filter('[data-time="' + today + '"]');
        if ($tar.length === 0) {
            var todayTime = today.replace(/-/g, '');
            $link.each(function (index, item) {
                var itemTime = $(item).attr('data-time');
                itemTime = itemTime.replace(/-/g, '');
                if (itemTime > todayTime) {
                    $tar = $(item);
                    return false;//->结束EACH循环
                }
            });
        }
        if ($tar.length === 0) {
            $tar = $link.eq($link.length - 1);
        }

        var index = $tar.parent().index(),
            curL = -index * 110 + 330;
        curL = curL > maxL ? maxL : (curL < minL ? minL : curL);
        $tar.addClass('bg');
        $wrapper.css('left', curL);

        //->控制MATCH区域的数据
        var starIndex = Math.abs(curL) / 110,
            endIndex = starIndex + 6,
            startTime = $link.eq(starIndex).attr('data-time'),
            endTime = $link.eq(endIndex).attr('data-time');
        matchRender.init(columnId, startTime, endTime);
    });

    //->左右切换
    $calendarPlan.add(function (today, data, columnId) {
        $btn.on('click', function () {
            var curL = parseFloat($wrapper.css('left'));
            if (curL % 110 !== 0) {
                curL = Math.round(curL / 110) * 110;
            }
            $(this).hasClass('btnLeft') ? curL += 770 : curL -= 770;
            curL = curL > maxL ? maxL : (curL < minL ? minL : curL);

            $wrapper.stop().animate({left: curL}, 300, function () {
                var starIndex = Math.abs(curL) / 110;
                $link.eq(starIndex).addClass('bg').parent().siblings().children('a').removeClass('bg');

                //->控制MATCH区域的数据
                matchRender.init(columnId);
            });
        });
    });


    return {
        init: function (columnId) {
            /*
             * columnId:赛事类型ID,每一场不同的赛事有不同的唯一的ID,例如:NBA->100000 CBA->100008 ... 我们每一次获取数据都是把传递进来的ID发送给服务器，服务器返回给我们对应赛事的日历信息
             * 1、从腾讯服务器上把数据获取到,然后解析成为我们需要的
             * 2、把数据展示在页面中(数据绑定)
             * 3、定位到今天日期的位置
             * 4、实现左右切换
             * 5、给每一项绑定点击事件
             */
            $.ajax({
                url: 'http://matchweb.sports.qq.com/kbs/calendar?columnId=' + columnId,
                type: 'get',
                dataType: 'jsonp',
                success: function (result) {
                    if (result && result.code == 0) {
                        result = result.data;
                        var today = result.today,
                            data = result.data;

                        //->数据获取成功后通知计划表中的方法执行
                        $calendarPlan.fire(today, data, columnId);
                    }
                }
            });
        }
    }
})();

/*
 * MATCH区域的操作
 */
var matchRender = (function () {
    return {
        init: function (columnId, startTime, endTime) {
            //->http://matchweb.sports.qq.com/kbs/list?columnId=100000&startTime=2017-01-09&endTime=2017-01-15
        }
    }
})();


menuRender.init();