//POC - extend to include icons for all the EIP's
import defaultCamelIcon from '../assets/camel-logo.svg';
import questionIcon from '../assets/question-mark.svg';
import expandIcon from '../assets/expand.svg';

export class NodeIconResolver {
  static getIcon = (iconName: string | undefined): string => {
    switch (iconName) {
      case 'choice':
        return 'data:image/gif;base64,R0lGODlhVgA2AKIAAP///8z/mYCAgAAAAP4BAgAAAAAAAAAAACH5BAQUAP8ALAAAAABWADYAAAP/OLrc/jDKSRm4oOrN+8PZEIxkaZ5oqq5sq4BKK890nSpCHtp875c4XexHLLKCgp1xyRwhlc3l4vccRosNX1V0JXq4pm3Xm+2Jx7zhVDvIJa1oGTwANreF9bhqLr2/83phgExngYJ6hYZ0g1eJiIxdjmN8j25Qk5BxkoSZlXiRnYGbVKGGozQxlHalN36XaWt9sTabX6xHHiinLmVGvbSuqjMMUbPAlsLDt6hkyMuKfc7Q04vS1Iq7103Z2tGf3Z5/4OGv48XBz+ao6OqY1u1Aybjv8IvG6/TtX7rs9U7EdvLBu4fvmz8nzQwexNJvIUOBDmE5s0WxYoeJFjNqfGAJKYObjyBDihxJsqTJkyJBoFzJsqXLlB5fypxJsyOImzhz6tzJs6fPnwkAADs=';
      case 'log':
        return 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE2LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9IjUxMnB4IiBoZWlnaHQ9IjUxMnB4IiB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNTEyIDUxMjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPHBhdGggZD0iTTQ0OCwwSDY0QzQ2LjMyOCwwLDMyLDE0LjMxMywzMiwzMnY0NDhjMCwxNy42ODgsMTQuMzI4LDMyLDMyLDMyaDM4NGMxNy42ODgsMCwzMi0xNC4zMTIsMzItMzJWMzINCgkJQzQ4MCwxNC4zMTMsNDY1LjY4OCwwLDQ0OCwweiBNNjQsNDgwVjEyOGg4MHY2NEg5NnYxNmg0OHY0OEg5NnYxNmg0OHY0OEg5NnYxNmg0OHY0OEg5NnYxNmg0OHY4MEg2NHogTTQ0OCw0ODBIMTYwdi04MGgyNTZ2LTE2DQoJCUgxNjB2LTQ4aDI1NnYtMTZIMTYwdi00OGgyNTZ2LTE2SDE2MHYtNDhoMjU2di0xNkgxNjB2LTY0aDI4OFY0ODB6Ii8+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8L3N2Zz4NCg==';
      case '':
        return this.getUnknownIcon();
      default:
        return this.getDefaultCamelIcon();
    }
  };

  static getUnknownIcon = (): string => {
    return questionIcon;
  };

  static getPlaceholderIcon = (): string => {
    return expandIcon;
  };

  static getDefaultCamelIcon = (): string => {
    return defaultCamelIcon;
  };
}
